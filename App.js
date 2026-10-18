import React, {useState, useEffect, useRef, useCallback, createContext, useContext} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, Share,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, Modal, useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Svg, {Path, Circle, Polyline, Rect, Line} from 'react-native-svg';

/* ===================== TEMA ===================== */
const C = {
  ink: '#F3F5F8', soft: '#C7CCD6', paper: '#0B0D11', card: '#181B21',
  glass: 'rgba(255,255,255,0.09)', red: '#FF4D3D', redDark: '#D6362A',
  lime: '#D6FA3C', line: 'rgba(255,255,255,0.14)', gray: '#9298A6', grayLight: '#5C6270',
};
const TYPE_LABEL = {corrida: 'Corrida', bike: 'Bike', esteira: 'Esteira'};
const TYPE_ICON = {corrida: '🏃', bike: '🚴', esteira: '🏃'};

/* ===================== ARMAZENAMENTO LOCAL ===================== */
const PFX = 'pc:';
async function sGet(k) { try { const v = await AsyncStorage.getItem(PFX + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
async function sSet(k, v) { try { await AsyncStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} }
async function sDel(k) { try { await AsyncStorage.removeItem(PFX + k); } catch (e) {} }
async function sAll(prefix) {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PFX + prefix));
    if (!keys.length) return [];
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs.map(([, v]) => { try { return JSON.parse(v); } catch (e) { return null; } }).filter(Boolean);
  } catch (e) { return []; }
}

/* ===================== UTILIDADES ===================== */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function nameColor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 55%, 42%)`;
}
const initials = n => n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const pad2 = n => String(n).padStart(2, '0');
function fmtDate(iso) { const d = new Date(iso); return `${pad2(d.getDate())} ${MESES[d.getMonth()]}`; }
function fmtClock(total) {
  total = Math.max(0, Math.floor(total));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}
function fmtDateTime(iso) {
  const d = new Date(iso), now = new Date();
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return `Hoje às ${hm}`;
  if (d.toDateString() === y.toDateString()) return `Ontem às ${hm}`;
  return `${fmtDate(iso)} às ${hm}`;
}
function haversine(a, b) {
  const R = 6371000, rad = x => x * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function paceStr(durationSec, km) {
  if (!(km > 0.02)) return '--:--';
  const pm = (durationSec / 60) / km;
  return `${Math.floor(pm)}:${pad2(Math.round((pm % 1) * 60) % 60)}`;
}
function mondayOf(d) {
  const x = new Date(d); const day = x.getDay() || 7;
  if (day !== 1) x.setDate(x.getDate() - (day - 1));
  x.setHours(0, 0, 0, 0); return x;
}
function weekStreak(mine) {
  const weeks = new Set(mine.map(p => mondayOf(new Date(p.date)).toDateString()));
  let n = 0; const cur = mondayOf(new Date());
  while (weeks.has(cur.toDateString())) { n++; cur.setDate(cur.getDate() - 7); }
  return n;
}
function periodWord(h) { return h < 12 ? 'pela manhã' : h < 18 ? 'à tarde' : 'à noite'; }
function autoTitle(type, iso) {
  const h = new Date(iso).getHours();
  const base = type === 'bike' ? 'Pedal' : type === 'esteira' ? 'Treino na esteira' : 'Corrida';
  return `${base} ${periodWord(h)}`;
}
const pairKey = (a, b) => [a, b].sort().join('~');
const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);

async function pickPhotos(limit, maxW, quality) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Permissão necessária', 'Libere o acesso às fotos em Ajustes.'); return []; }
  const r = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], allowsMultipleSelection: limit > 1, selectionLimit: limit, quality: 1});
  if (r.canceled) return [];
  const out = [];
  for (const a of r.assets.slice(0, limit)) {
    try {
      const m = await ImageManipulator.manipulateAsync(a.uri, [{resize: {width: maxW}}], {compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true});
      out.push('data:image/jpeg;base64,' + m.base64);
    } catch (e) {}
  }
  return out;
}

/* ===================== GPS (primeiro e segundo plano) ===================== */
const GPS_TASK = 'pozzattclub-gps';
const TRACK = {points: [], distance: 0, recording: false, skipNext: false};
function addPoint(p, acc) {
  if (!TRACK.recording) return;
  if (acc && acc > 50) return;
  const pts = TRACK.points;
  if (pts.length && !TRACK.skipNext) {
    const d = haversine(pts[pts.length - 1], p);
    if (d < 3) return;
    TRACK.distance += d;
  }
  TRACK.skipNext = false;
  pts.push(p);
}
TaskManager.defineTask(GPS_TASK, ({data, error}) => {
  if (error || !data) return;
  (data.locations || []).forEach(l => addPoint([l.coords.latitude, l.coords.longitude], l.coords.accuracy));
});

/* ===================== CONTEXTO ===================== */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

/* ===================== COMPONENTES BÁSICOS ===================== */
function Avatar({name, photo, size = 40}) {
  if (photo) return <Image source={{uri: photo}} style={{width: size, height: size, borderRadius: size / 2}} />;
  return (
    <View style={{width: size, height: size, borderRadius: size / 2, backgroundColor: nameColor(name || '?'), alignItems: 'center', justifyContent: 'center'}}>
      <Text style={{color: '#fff', fontWeight: '800', fontSize: size * 0.4}}>{initials(name || '?')}</Text>
    </View>
  );
}
function UserAvatar({email, name, size}) {
  const {users} = useApp();
  return <Avatar name={name} photo={users[email] && users[email].photo} size={size} />;
}
function Btn({title, onPress, style, textStyle, color = C.red}) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[{backgroundColor: color, borderRadius: 9, paddingVertical: 13, alignItems: 'center', marginTop: 6}, style]}>
      <Text style={[{color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.4, textTransform: 'uppercase'}, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}
function Field({label, ...props}) {
  return (
    <View style={{marginBottom: 12}}>
      <Text style={{fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: C.gray, marginBottom: 5}}>{label}</Text>
      <TextInput placeholderTextColor={C.grayLight} {...props}
        style={[{borderWidth: 1.5, borderColor: C.line, borderRadius: 9, padding: 11, fontSize: 16, color: C.ink, backgroundColor: 'rgba(255,255,255,0.04)'}, props.multiline && {minHeight: 70, textAlignVertical: 'top'}]} />
    </View>
  );
}
function Section({title, accent}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 10}}>
      <Text style={{color: C.ink, fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: -0.2}}>{title}</Text>
      <View style={{flex: 1, height: accent ? 2 : 1, backgroundColor: accent ? C.red : C.line}} />
    </View>
  );
}
function Empty({title, text}) {
  return (
    <View style={{padding: 36, alignItems: 'center'}}>
      {title ? <Text style={{color: C.ink, fontWeight: '800', fontSize: 16, textTransform: 'uppercase', marginBottom: 6, textAlign: 'center'}}>{title}</Text> : null}
      <Text style={{color: C.gray, fontSize: 13.5, textAlign: 'center', lineHeight: 19}}>{text}</Text>
    </View>
  );
}
function StatRow({items}) {
  return (
    <View style={{flexDirection: 'row', paddingVertical: 12}}>
      {items.map(([l, v], i) => (
        <View key={i} style={{flex: 1}}>
          <Text style={{color: C.gray, fontSize: 11, fontWeight: '600', marginBottom: 3}}>{l}</Text>
          <Text style={{color: C.ink, fontSize: 19, fontWeight: '800'}}>{v}</Text>
        </View>
      ))}
    </View>
  );
}
const cardStyle = {backgroundColor: C.card, borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.line};

/* ===================== ROTA (SVG, funciona offline) ===================== */
function RouteView({points, width, height}) {
  const bg = {width, height, backgroundColor: '#10131A', borderRadius: 14, overflow: 'hidden'};
  if (!points || points.length < 2) {
    return <View style={[bg, {alignItems: 'center', justifyContent: 'center'}]}><Text style={{color: C.gray, fontSize: 12}}>Aguardando sinal de GPS…</Text></View>;
  }
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const p of points) {
    if (p[0] < minLat) minLat = p[0]; if (p[0] > maxLat) maxLat = p[0];
    if (p[1] < minLon) minLon = p[1]; if (p[1] > maxLon) maxLon = p[1];
  }
  const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const w = Math.max((maxLon - minLon) * kx, 1e-5), h = Math.max(maxLat - minLat, 1e-5);
  const padd = 20, s = Math.min((width - padd * 2) / w, (height - padd * 2) / h);
  const ox = (width - w * s) / 2, oy = (height - h * s) / 2;
  const xy = points.map(p => [ox + (p[1] - minLon) * kx * s, oy + (maxLat - p[0]) * s]);
  const pts = xy.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
  const a = xy[0], b = xy[xy.length - 1];
  return (
    <View style={bg}>
      <Svg width={width} height={height}>
        <Polyline points={pts} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points={pts} fill="none" stroke={C.red} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={a[0]} cy={a[1]} r={5} fill={C.lime} />
        <Circle cx={b[0]} cy={b[1]} r={7} fill={C.red} stroke="#fff" strokeWidth={2} />
      </Svg>
    </View>
  );
}

/* ===================== LOGIN ===================== */
function AuthScreen({onLogin}) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [pass, setPass] = useState(''); const [role, setRole] = useState('aluno');
  const [err, setErr] = useState('');
  async function submit() {
    setErr('');
    const em = email.trim().toLowerCase();
    if (!em || !pass) return setErr('Preencha e-mail e senha.');
    if (mode === 'register') {
      if (!name.trim()) return setErr('Informe seu nome.');
      if (await sGet('user:' + em)) return setErr('Já existe uma conta com esse e-mail. Faça login.');
      const u = {name: name.trim(), email: em, pass, role, joined: new Date().toISOString()};
      await sSet('user:' + em, u); onLogin(u);
    } else {
      const u = await sGet('user:' + em);
      if (!u || u.pass !== pass) return setErr('E-mail ou senha incorretos.');
      onLogin(u);
    }
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1, backgroundColor: '#06070A'}}>
      <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', padding: 28}} keyboardShouldPersistTaps="handled">
        <Text style={{color: C.lime, fontWeight: '700', fontSize: 14, letterSpacing: 4, textAlign: 'center'}}>CLUBE DE CORRIDA & TREINO</Text>
        <Text style={{color: '#fff', fontWeight: '800', fontSize: 42, textAlign: 'center', textTransform: 'uppercase', letterSpacing: -1, marginTop: 6}}>Pozzatt<Text style={{color: C.lime}}>Club</Text></Text>
        <Text style={{color: '#AEB6CC', fontSize: 14, textAlign: 'center', marginBottom: 30, marginTop: 6}}>Grave. Suba fotos. Siga o treino da semana.</Text>
        <View style={{backgroundColor: C.glass, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: C.line}}>
          <View style={{flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, marginBottom: 18}}>
            {[['login', 'Entrar'], ['register', 'Criar conta']].map(([m, l]) => (
              <TouchableOpacity key={m} onPress={() => {setMode(m); setErr('');}} style={{flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: mode === m ? C.red : 'transparent'}}>
                <Text style={{color: mode === m ? '#fff' : C.gray, fontWeight: '700', fontSize: 13}}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {err ? <Text style={{color: C.red, fontSize: 13, marginBottom: 10}}>{err}</Text> : null}
          {mode === 'register' && <Field label="Nome completo" value={name} onChangeText={setName} placeholder="Seu nome" />}
          <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Field label="Senha" value={pass} onChangeText={setPass} placeholder="••••••••" secureTextEntry />
          {mode === 'register' && (
            <View style={{marginBottom: 12}}>
              <Text style={{fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: C.gray, marginBottom: 5}}>Você é</Text>
              <View style={{flexDirection: 'row', gap: 8}}>
                {[['aluno', '🏃 Aluno'], ['coach', '📋 Treinador']].map(([r, l]) => (
                  <TouchableOpacity key={r} onPress={() => setRole(r)} style={{flex: 1, borderWidth: 1.5, borderColor: role === r ? C.red : C.line, borderRadius: 9, padding: 10, alignItems: 'center'}}>
                    <Text style={{color: role === r ? C.red : C.ink, fontWeight: '600', fontSize: 13}}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <Btn title={mode === 'login' ? 'Entrar' : 'Criar conta'} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ===================== POST CARD ===================== */
function PostCard({p, onChange}) {
  const {user} = useApp();
  const {width} = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');
  const liked = (p.likes || []).includes(user.email);
  const photos = p.photos || [];
  const isMine = p.authorEmail === user.email;
  const stat2 = p.type === 'bike' ? ['Velocidade méd (km/h)', p.speed ? p.speed.toFixed(1) : '0.0'] : ['Ritmo méd (/km)', p.pace || '--:--'];
  const ring = p.type === 'bike' ? C.lime : p.type === 'esteira' ? C.soft : C.red;
  const imgW = width - 28 - 2;

  async function like() {
    const q = await sGet('post:' + p.id); if (!q) return;
    q.likes = q.likes || [];
    const i = q.likes.indexOf(user.email);
    if (i >= 0) q.likes.splice(i, 1); else q.likes.push(user.email);
    await sSet('post:' + p.id, q); onChange();
  }
  async function comment() {
    const t = txt.trim(); if (!t) return;
    const q = await sGet('post:' + p.id); if (!q) return;
    q.comments = q.comments || [];
    q.comments.push({author: user.name, email: user.email, text: t, date: new Date().toISOString()});
    await sSet('post:' + p.id, q); setTxt(''); onChange();
  }
  function del() {
    Alert.alert('Excluir treino', 'Excluir este treino do feed? Essa ação não pode ser desfeita.', [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Excluir', style: 'destructive', onPress: async () => { await sDel('post:' + p.id); onChange(); }},
    ]);
  }
  function share() {
    const km = p.distance ? p.distance.toFixed(2) : '0.00';
    Share.share({message: `${TYPE_ICON[p.type] || ''} ${autoTitle(p.type, p.date)}\n${km} km · ${fmtClock(p.duration)} · ${p.type === 'bike' ? stat2[1] + ' km/h' : (p.pace || '--:--') + ' /km'}\n— ${p.authorName} no PozzattClub`});
  }
  return (
    <View style={cardStyle}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <View style={{padding: 2, borderRadius: 30, borderWidth: 2, borderColor: ring}}><UserAvatar email={p.authorEmail} name={p.authorName} size={38} /></View>
        <View style={{flex: 1}}>
          <Text style={{color: C.ink, fontWeight: '700', fontSize: 15}}>{p.authorName}</Text>
          <Text style={{color: C.gray, fontSize: 12, marginTop: 1}}>{TYPE_ICON[p.type] || ''} {fmtDateTime(p.date)}</Text>
        </View>
        {isMine && <TouchableOpacity onPress={del} hitSlop={10}><Text style={{color: C.gray, fontSize: 22, paddingHorizontal: 6}}>⋯</Text></TouchableOpacity>}
      </View>
      <Text style={{color: C.ink, fontSize: 18, fontWeight: '800', marginTop: 12}}>{autoTitle(p.type, p.date)}</Text>
      {p.caption ? <Text style={{color: C.soft, fontSize: 14, marginTop: 4, lineHeight: 20}}>{p.caption}</Text> : null}
      {photos.length > 0 && (
        <View style={{flexDirection: 'row', gap: 3, marginTop: 10, borderRadius: 12, overflow: 'hidden'}}>
          {photos.slice(0, 3).map((ph, i) => (
            <Image key={i} source={{uri: ph}} style={{flex: 1, height: photos.length === 1 ? 260 : 150}} resizeMode="cover" />
          ))}
        </View>
      )}
      {photos.length === 0 && p.route && p.route.length > 1 && <View style={{marginTop: 10}}><RouteView points={p.route} width={imgW} height={150} /></View>}
      <StatRow items={[['Tempo', fmtClock(p.duration)], ['Distância', (p.distance ? p.distance.toFixed(2) : '0.00') + ' km'], stat2]} />
      {(p.likes || []).length === 0 && <Text style={{color: C.gray, fontSize: 12, marginBottom: 6}}>Seja o primeiro a dar kudos!</Text>}
      <View style={{flexDirection: 'row', gap: 22, paddingTop: 4}}>
        <TouchableOpacity onPress={like} style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill={liked ? C.red : 'none'} stroke={liked ? C.red : C.gray} strokeWidth={2}>
            <Path d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0l4.5-8a2 2 0 013.8 1l-.9 5.5H19a2 2 0 012 2.3l-1.3 6A2 2 0 0117.8 20H10a3 3 0 01-3-3" />
          </Svg>
          <Text style={{color: liked ? C.red : C.gray, fontWeight: '700'}}>{(p.likes || []).length || ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setOpen(!open)} style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.gray} strokeWidth={2}>
            <Path d="M21 11.5a8.4 8.4 0 01-8.9 8.4A9 9 0 013 15.2l-1 4.3 4.4-1a8.4 8.4 0 016-2.5A8.4 8.4 0 0121 11.5z" />
          </Svg>
          <Text style={{color: C.gray, fontWeight: '700'}}>{(p.comments || []).length || ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={share}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.gray} strokeWidth={2}>
            <Circle cx={18} cy={5} r={3} /><Circle cx={6} cy={12} r={3} /><Circle cx={18} cy={19} r={3} />
            <Path d="M8.6 10.6l6.8-3.8M8.6 13.4l6.8 3.8" />
          </Svg>
        </TouchableOpacity>
      </View>
      {open && (
        <View style={{marginTop: 12, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10}}>
          {(p.comments || []).length === 0 && <Text style={{color: C.gray, fontSize: 12}}>Nenhum comentário ainda.</Text>}
          {(p.comments || []).map((cm, i) => (
            <Text key={i} style={{color: C.soft, fontSize: 14, marginBottom: 6}}><Text style={{color: C.ink, fontWeight: '700'}}>{cm.author} </Text>{cm.text}</Text>
          ))}
          <View style={{flexDirection: 'row', gap: 8, marginTop: 6}}>
            <TextInput value={txt} onChangeText={setTxt} placeholder="Escreva um comentário…" placeholderTextColor={C.grayLight} onSubmitEditing={comment}
              style={{flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 16, color: C.ink}} />
            <TouchableOpacity onPress={comment} style={{justifyContent: 'center', paddingHorizontal: 8}}><Text style={{color: C.red, fontWeight: '800'}}>Enviar</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/* ===================== FEED ===================== */
function StreakCard({mine}) {
  const letters = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const monday = mondayOf(new Date());
  const active = new Set(mine.map(p => new Date(p.date).toDateString()));
  const today = new Date().toDateString();
  const streak = weekStreak(mine);
  return (
    <View style={cardStyle}>
      <Text style={{color: C.ink, fontWeight: '800', fontSize: 13, textTransform: 'uppercase', marginBottom: 12}}>Sua sequência</Text>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <View style={{alignItems: 'center', width: 70}}>
          <Text style={{fontSize: 26}}>🔥</Text>
          <Text style={{color: C.ink, fontWeight: '800', fontSize: 20}}>{streak}</Text>
          <Text style={{color: C.gray, fontSize: 11}}>{streak === 1 ? 'semana' : 'semanas'}</Text>
        </View>
        <View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-between'}}>
          {letters.map((l, i) => {
            const d = new Date(monday); d.setDate(monday.getDate() + i);
            const on = active.has(d.toDateString()); const isT = d.toDateString() === today;
            return (
              <View key={i} style={{alignItems: 'center', gap: 5}}>
                <Text style={{color: C.gray, fontSize: 11, fontWeight: '700'}}>{l}</Text>
                <View style={{width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.red : 'transparent', borderWidth: 1.5, borderColor: on ? C.red : isT ? C.lime : C.line}}>
                  <Text style={{color: on ? '#fff' : C.soft, fontSize: 12, fontWeight: '700'}}>{d.getDate()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
function Feed({rk, refresh}) {
  const {user} = useApp();
  const [posts, setPosts] = useState(null);
  useEffect(() => { sAll('post:').then(a => setPosts(a.sort((x, y) => new Date(y.date) - new Date(x.date)))); }, [rk]);
  if (!posts) return <Empty text="Carregando…" />;
  const mine = posts.filter(p => p.authorEmail === user.email);
  return (
    <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 30}}>
      <StreakCard mine={mine} />
      {posts.length === 0
        ? <Empty title="Nenhum treino ainda" text={'Seja o primeiro do clube a gravar um treino hoje.\nToque em Gravar para começar.'} />
        : posts.map(p => <PostCard key={p.id} p={p} onChange={refresh} />)}
    </ScrollView>
  );
}

/* ===================== TREINOS ===================== */
function Treinos({rk, refresh}) {
  const {user} = useApp();
  const [list, setList] = useState(null);
  const [title, setTitle] = useState(''); const [type, setType] = useState('corrida');
  const [date, setDate] = useState(''); const [desc, setDesc] = useState('');
  const isCoach = user.role === 'coach';
  useEffect(() => { sAll('workout:').then(a => setList(a.sort((x, y) => new Date(y.date) - new Date(x.date)))); }, [rk]);
  async function create() {
    if (!title.trim() || !desc.trim()) return Alert.alert('Atenção', 'Preencha título e descrição do treino.');
    const id = uid();
    const d = /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? date.trim() : new Date().toISOString().slice(0, 10);
    await sSet('workout:' + id, {id, title: title.trim(), type, date: d, description: desc.trim(), createdBy: user.email, createdByName: user.name, completedBy: []});
    setTitle(''); setDesc(''); setDate(''); refresh();
  }
  async function toggleDone(id) {
    const w = await sGet('workout:' + id); if (!w) return;
    w.completedBy = w.completedBy || [];
    const i = w.completedBy.indexOf(user.email);
    if (i >= 0) w.completedBy.splice(i, 1); else w.completedBy.push(user.email);
    await sSet('workout:' + id, w); refresh();
  }
  if (!list) return <Empty text="Carregando…" />;
  return (
    <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 30}} keyboardShouldPersistTaps="handled">
      {isCoach && (
        <View>
          <Section title="Gerenciar treinos" />
          <View style={cardStyle}>
            <Text style={{color: C.ink, fontWeight: '800', fontSize: 14, textTransform: 'uppercase', marginBottom: 12}}>Novo treino para o clube</Text>
            <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Tiro de 400m x 8" />
            <View style={{flexDirection: 'row', gap: 6, marginBottom: 12}}>
              {Object.keys(TYPE_LABEL).map(t => (
                <TouchableOpacity key={t} onPress={() => setType(t)} style={{flex: 1, borderWidth: 1.5, borderColor: type === t ? C.red : C.line, borderRadius: 9, paddingVertical: 9, alignItems: 'center'}}>
                  <Text style={{color: type === t ? C.red : C.ink, fontWeight: '600', fontSize: 13}}>{TYPE_ICON[t]} {TYPE_LABEL[t]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Field label="Data (AAAA-MM-DD, vazio = hoje)" value={date} onChangeText={setDate} placeholder="2026-10-20" autoCapitalize="none" />
            <Field label="Descrição do treino" value={desc} onChangeText={setDesc} multiline placeholder="Aquecimento, séries, ritmo alvo…" />
            <Btn title="Publicar para o clube" onPress={create} />
          </View>
        </View>
      )}
      <Section title={isCoach ? 'Treinos publicados' : 'Treino da semana'} />
      {list.length === 0
        ? <Empty title="Sem treinos por aqui" text={isCoach ? 'Publique o primeiro treino do clube acima.' : 'Seu treinador ainda não postou nenhum treino.'} />
        : list.map(w => {
          const done = (w.completedBy || []).includes(user.email);
          return (
            <View key={w.id} style={[cardStyle, done && {borderColor: C.lime}]}>
              <Text style={{color: C.ink, fontSize: 17, fontWeight: '800'}}>{w.title}</Text>
              <Text style={{color: C.gray, fontSize: 12, marginTop: 2}}>{fmtDate(w.date)} · por {w.createdByName}</Text>
              <Text style={{color: C.soft, fontSize: 14, lineHeight: 20, marginTop: 10}}>{w.description}</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12}}>
                <Text style={{color: C.ink, fontWeight: '700', fontSize: 12, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: 'hidden'}}>{TYPE_ICON[w.type] || ''} {TYPE_LABEL[w.type] || w.type}</Text>
                {isCoach
                  ? <Text style={{color: C.gray, fontSize: 11, fontWeight: '700'}}>{(w.completedBy || []).length} concluíram</Text>
                  : <TouchableOpacity onPress={() => toggleDone(w.id)} style={{backgroundColor: done ? C.lime : 'transparent', borderWidth: 1.5, borderColor: done ? C.lime : C.line, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7}}>
                    <Text style={{color: done ? '#0B0D11' : C.ink, fontWeight: '800', fontSize: 12}}>{done ? '✓ Concluído' : 'Marcar concluído'}</Text>
                  </TouchableOpacity>}
              </View>
            </View>
          );
        })}
    </ScrollView>
  );
}

/* ===================== GRUPOS ===================== */
function Grupos({rk}) {
  const {user} = useApp();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    (async () => {
      const users = await sAll('user:'); const posts = await sAll('post:');
      const weekAgo = Date.now() - 7 * 86400000;
      setRows(users.map(u => {
        const mine = posts.filter(p => p.authorEmail === u.email);
        return {u, count: mine.length, total: sum(mine, p => p.distance), week: sum(mine.filter(p => new Date(p.date).getTime() > weekAgo), p => p.distance)};
      }).sort((a, b) => b.week - a.week));
    })();
  }, [rk]);
  if (!rows) return <Empty text="Carregando…" />;
  const row = r => (
    <View key={r.u.email} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line}}>
      <UserAvatar email={r.u.email} name={r.u.name} size={44} />
      <View style={{flex: 1}}>
        <Text style={{color: C.ink, fontWeight: '700', fontSize: 15}}>{r.u.name}{r.u.email === user.email ? <Text style={{color: C.gray, fontWeight: '600'}}> (você)</Text> : null}</Text>
        <Text style={{color: C.gray, fontSize: 12, marginTop: 2}}>{r.count} treino{r.count === 1 ? '' : 's'} · {r.total.toFixed(1)} km no total</Text>
      </View>
      <View style={{alignItems: 'flex-end'}}>
        <Text style={{color: C.ink, fontWeight: '800', fontSize: 17}}>{r.week.toFixed(1)}</Text>
        <Text style={{color: C.gray, fontSize: 10}}>km/sem</Text>
      </View>
    </View>
  );
  const coaches = rows.filter(r => r.u.role === 'coach'), alunos = rows.filter(r => r.u.role !== 'coach');
  return (
    <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 30}}>
      <Section title="Treinadores" />
      {coaches.length ? coaches.map(row) : <Empty text="Nenhum treinador cadastrado ainda." />}
      <Section title="Alunos do clube" />
      {alunos.length ? alunos.map(row) : <Empty text="Nenhum aluno cadastrado ainda." />}
    </ScrollView>
  );
}

/* ===================== PERFIL ===================== */
function Sparkline({posts, weeks = 12, width}) {
  const now = new Date(); const buckets = Array(weeks).fill(0);
  posts.forEach(p => {
    const w = Math.floor(Math.floor((now - new Date(p.date)) / 86400000) / 7);
    if (w >= 0 && w < weeks) buckets[weeks - 1 - w] += p.distance || 0;
  });
  const max = Math.max(1, ...buckets), H = 70, pd = 6;
  const pts = buckets.map((v, i) => [pd + i * ((width - pd * 2) / (weeks - 1)), H - pd - (v / max) * (H - pd * 2)]);
  const line = pts.map((q, i) => (i === 0 ? 'M' : 'L') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
  return (
    <Svg width={width} height={H}>
      <Path d={area} fill="rgba(255,77,61,0.15)" />
      <Path d={line} fill="none" stroke={C.red} strokeWidth={2} />
      {pts.map((q, i) => <Circle key={i} cx={q[0]} cy={q[1]} r={2.6} fill={C.red} />)}
    </Svg>
  );
}
function MonthCalendar({mine}) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const act = {}; mine.forEach(p => { act[new Date(p.date).toDateString()] = p.type; });
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(<View key={'e' + i} style={{width: '14.28%', height: 38}} />);
  for (let d = 1; d <= days; d++) {
    const key = new Date(y, m, d).toDateString(); const a = act[key]; const isT = key === now.toDateString();
    cells.push(
      <View key={d} style={{width: '14.28%', height: 38, alignItems: 'center', justifyContent: 'center'}}>
        <View style={{width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: a ? 'rgba(255,77,61,0.22)' : 'transparent', borderWidth: isT ? 1.5 : 0, borderColor: C.lime}}>
          <Text style={{color: a ? C.ink : C.soft, fontSize: a ? 15 : 12}}>{a ? (TYPE_ICON[a] || '🏃') : d}</Text>
        </View>
      </View>
    );
  }
  const sk = weekStreak(mine);
  return (
    <View style={cardStyle}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
        <Text style={{color: C.ink, fontWeight: '800', fontSize: 14, textTransform: 'capitalize'}}>{MESES_LONGOS[m]} de {y}</Text>
        <Text style={{color: C.gray, fontSize: 11, fontWeight: '700'}}>🔥 {sk} {sk === 1 ? 'semana' : 'semanas'}</Text>
      </View>
      <View style={{flexDirection: 'row'}}>{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => <Text key={i} style={{width: '14.28%', textAlign: 'center', color: C.gray, fontSize: 11, fontWeight: '700'}}>{l}</Text>)}</View>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 4}}>{cells}</View>
    </View>
  );
}
function Perfil({rk, refresh, onLogout, onUserChange}) {
  const {user} = useApp();
  const {width} = useWindowDimensions();
  const [tab, setTab] = useState('progresso'); const [filter, setFilter] = useState('todos');
  const [mine, setMine] = useState([]); const [done, setDone] = useState([]);
  const [edit, setEdit] = useState(false); const [q, setQ] = useState('');
  const [nm, setNm] = useState(user.name); const [loc, setLoc] = useState(user.location || ''); const [bio, setBio] = useState(user.bio || '');
  useEffect(() => {
    (async () => {
      const posts = await sAll('post:'); const ws = await sAll('workout:');
      setMine(posts.filter(p => p.authorEmail === user.email).sort((a, b) => new Date(b.date) - new Date(a.date)));
      setDone(ws.filter(w => (w.completedBy || []).includes(user.email)).sort((a, b) => new Date(b.date) - new Date(a.date)));
    })();
  }, [rk]);
  async function saveProfile() {
    const u = {...user, name: nm.trim() || user.name, location: loc.trim(), bio: bio.trim()};
    await sSet('user:' + u.email, u); onUserChange(u); setEdit(false);
  }
  async function changeAvatar() {
    const r = await pickPhotos(1, 320, 0.75);
    if (!r.length) return;
    const u = {...user, photo: r[0]}; await sSet('user:' + u.email, u); onUserChange(u);
  }
  const filtered = filter === 'todos' ? mine : mine.filter(p => p.type === filter);
  const weekAgo = Date.now() - 7 * 86400000;
  const wk = filtered.filter(p => new Date(p.date).getTime() > weekAgo);
  const cover = mine.flatMap(p => p.photos || []).slice(0, 4);
  const search = q.trim().toLowerCase();
  const acts = !search ? mine : mine.filter(p => `${TYPE_LABEL[p.type] || ''} ${autoTitle(p.type, p.date)} ${p.caption || ''} ${p.distance ? p.distance.toFixed(1) + 'km' : ''}`.toLowerCase().includes(search));
  return (
    <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 40}} keyboardShouldPersistTaps="handled">
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
        <TouchableOpacity onPress={changeAvatar}>
          <Avatar name={user.name} photo={user.photo} size={72} />
          <View style={{position: 'absolute', right: -2, bottom: -2, backgroundColor: C.red, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center'}}><Text style={{color: '#fff', fontSize: 12}}>✎</Text></View>
        </TouchableOpacity>
        <View style={{flex: 1}}>
          <Text style={{color: C.ink, fontWeight: '800', fontSize: 22, textTransform: 'uppercase'}}>{user.name}</Text>
          <Text style={{color: C.gray, fontSize: 13, marginTop: 2}}>{user.role === 'coach' ? '📋 Treinador PozzattClub' : '🏃 Aluno PozzattClub'}</Text>
          {user.location ? <Text style={{color: C.gray, fontSize: 12, marginTop: 2}}>📍 {user.location}</Text> : null}
        </View>
      </View>
      {user.bio ? <Text style={{color: C.soft, fontSize: 14, lineHeight: 20, marginTop: 12}}>{user.bio}</Text> : null}
      <TouchableOpacity onPress={() => setEdit(!edit)} style={{borderWidth: 1.5, borderColor: C.line, borderRadius: 9, paddingVertical: 10, alignItems: 'center', marginTop: 14}}>
        <Text style={{color: C.ink, fontWeight: '700'}}>✎ Editar perfil</Text>
      </TouchableOpacity>
      {edit && (
        <View style={[cardStyle, {marginTop: 12}]}>
          <Field label="Nome" value={nm} onChangeText={setNm} />
          <Field label="Localização" value={loc} onChangeText={setLoc} placeholder="Cidade, Estado" />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline placeholder="Conte um pouco sobre você" />
          <Btn title="Salvar" onPress={saveProfile} />
        </View>
      )}
      {cover.length > 0 && (
        <View style={{flexDirection: 'row', gap: 3, marginTop: 14, borderRadius: 12, overflow: 'hidden'}}>
          {cover.map((ph, i) => <Image key={i} source={{uri: ph}} style={{flex: 1, height: 80}} />)}
        </View>
      )}
      <View style={{flexDirection: 'row', marginTop: 18, borderBottomWidth: 1, borderBottomColor: C.line}}>
        {[['progresso', 'Progresso'], ['treinos', 'Treinos'], ['atividades', 'Atividades']].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setTab(k)} style={{flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === k ? C.red : 'transparent'}}>
            <Text style={{color: tab === k ? C.ink : C.gray, fontWeight: '800', fontSize: 14}}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'progresso' && (
        <View style={{marginTop: 14}}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 4}}>
            {[['todos', 'Todos'], ['corrida', '🏃 Corrida'], ['bike', '🚴 Bike'], ['esteira', '🏃 Esteira']].map(([k, l]) => (
              <TouchableOpacity key={k} onPress={() => setFilter(k)} style={{marginRight: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, borderWidth: 1.5, borderColor: filter === k ? C.red : C.line, backgroundColor: filter === k ? C.red : 'transparent'}}>
                <Text style={{color: filter === k ? '#fff' : C.ink, fontWeight: '700', fontSize: 13}}>{l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Section title="Esta semana" />
          <StatRow items={[['Distância', sum(wk, p => p.distance).toFixed(1) + ' km'], ['Tempo', fmtClock(sum(wk, p => p.duration))], ['Treinos', String(wk.length)]]} />
          <View style={[cardStyle, {marginTop: 8}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
              <Text style={{color: C.ink, fontWeight: '800'}}>Últimas 12 semanas</Text>
              <Text style={{color: C.gray, fontSize: 12}}>{sum(filtered, p => p.distance).toFixed(1)} km no total</Text>
            </View>
            <Sparkline posts={filtered} width={width - 28 - 30} />
          </View>
          <MonthCalendar mine={filtered} />
        </View>
      )}
      {tab === 'treinos' && (
        <View style={{marginTop: 4}}>
          <Section title="Treinos concluídos" />
          {done.length === 0
            ? <Empty title="Nada concluído ainda" text="Vá até a aba Treinos e marque os treinos do seu clube como concluídos." />
            : done.map(w => (
              <View key={w.id} style={[cardStyle, {borderColor: C.lime}]}>
                <Text style={{color: C.ink, fontSize: 16, fontWeight: '800'}}>{w.title}</Text>
                <Text style={{color: C.gray, fontSize: 12, marginTop: 2}}>{fmtDate(w.date)} · por {w.createdByName}</Text>
                <Text style={{color: C.soft, fontSize: 14, marginTop: 8, lineHeight: 20}}>{w.description}</Text>
                <Text style={{color: C.lime, fontWeight: '800', fontSize: 12, marginTop: 10}}>✓ Concluído</Text>
              </View>
            ))}
        </View>
      )}
      {tab === 'atividades' && (
        <View style={{marginTop: 14}}>
          <TextInput value={q} onChangeText={setQ} placeholder="Pesquise suas atividades" placeholderTextColor={C.grayLight}
            style={{borderWidth: 1.5, borderColor: C.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 16, color: C.ink, marginBottom: 14}} />
          {acts.length === 0 ? <Empty title="Ainda sem treinos" text="Seus treinos gravados vão aparecer aqui." /> : acts.map(p => <PostCard key={p.id} p={p} onChange={refresh} />)}
        </View>
      )}
      <TouchableOpacity onPress={onLogout} style={{marginTop: 24, alignItems: 'center', padding: 12}}>
        <Text style={{color: C.red, fontWeight: '800'}}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ===================== BUSCA ===================== */
function SearchModal({visible, onClose, rk, refresh}) {
  const [q, setQ] = useState(''); const [res, setRes] = useState([]);
  useEffect(() => {
    if (!visible) return;
    const t = q.trim().toLowerCase();
    if (!t) { setRes([]); return; }
    sAll('post:').then(posts => {
      const tokens = t.split(/\s+/);
      setRes(posts.filter(p => {
        const hay = `${TYPE_LABEL[p.type] || ''} ${autoTitle(p.type, p.date)} ${p.caption || ''} ${p.authorName} ${p.distance ? p.distance.toFixed(1) + 'km' : ''} ${p.distance ? Math.round(p.distance) + 'km' : ''}`.toLowerCase();
        return tokens.every(x => hay.includes(x));
      }).sort((a, b) => new Date(b.date) - new Date(a.date)));
    });
  }, [q, visible, rk]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{flex: 1, backgroundColor: C.paper}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: C.line}}>
          <TouchableOpacity onPress={onClose}><Text style={{color: C.ink, fontSize: 22, paddingHorizontal: 4}}>✕</Text></TouchableOpacity>
          <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Buscar treino: ex. corrida 5km" placeholderTextColor={C.grayLight}
            style={{flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 16, color: C.ink}} />
        </View>
        <ScrollView contentContainerStyle={{padding: 14}} keyboardShouldPersistTaps="handled">
          {!q.trim() ? <Empty text={'Busque por tipo de treino, distância ou nome — ex. "corrida 5km", "bike", "Bruno".'} />
            : res.length === 0 ? <Empty title="Nada encontrado" text="Tente outro termo, como o tipo de treino ou distância." />
              : res.map(p => <PostCard key={p.id} p={p} onChange={refresh} />)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/* ===================== CHAT ===================== */
function ChatModal({visible, onClose}) {
  const {user} = useApp();
  const [others, setOthers] = useState([]); const [with_, setWith] = useState(null);
  const [msgs, setMsgs] = useState([]); const [txt, setTxt] = useState('');
  const scroll = useRef(null);
  const isCoach = user.role === 'coach';
  useEffect(() => {
    if (!visible) { setWith(null); return; }
    sAll('user:').then(us => {
      if (isCoach) setOthers(us.filter(u => u.email !== user.email && u.role !== 'coach'));
      else { const c = us.find(u => u.role === 'coach'); setOthers(c ? [c] : []); if (c) setWith(c); }
    });
  }, [visible]);
  const load = useCallback(async () => {
    if (!with_) return;
    const all = await sAll('msg:' + pairKey(user.email, with_.email) + ':');
    setMsgs(all.sort((a, b) => new Date(a.date) - new Date(b.date)));
    setTimeout(() => scroll.current && scroll.current.scrollToEnd({animated: false}), 50);
  }, [with_]);
  useEffect(() => { load(); }, [load]);
  async function send() {
    const t = txt.trim(); if (!t || !with_) return;
    await sSet('msg:' + pairKey(user.email, with_.email) + ':' + uid(), {from: user.email, to: with_.email, text: t, date: new Date().toISOString()});
    setTxt(''); load();
  }
  const back = () => (isCoach && with_) ? setWith(null) : onClose();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{flex: 1, backgroundColor: C.paper}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.line}}>
          <TouchableOpacity onPress={back}><Text style={{color: C.ink, fontSize: 22, paddingHorizontal: 4}}>{isCoach && with_ ? '‹' : '✕'}</Text></TouchableOpacity>
          <Text style={{color: C.ink, fontWeight: '800', fontSize: 16}}>{with_ ? with_.name : 'Mensagens'}</Text>
        </View>
        {!with_ ? (
          <ScrollView contentContainerStyle={{padding: 14}}>
            {others.length === 0 ? <Empty text={isCoach ? 'Nenhum aluno cadastrado ainda.' : 'Ainda não há um treinador cadastrado no clube.'} />
              : others.map(u => (
                <TouchableOpacity key={u.email} onPress={() => setWith(u)} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line}}>
                  <Avatar name={u.name} photo={u.photo} size={42} />
                  <Text style={{color: C.ink, fontWeight: '700', fontSize: 15}}>{u.name}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
            <ScrollView ref={scroll} contentContainerStyle={{padding: 14}}>
              {msgs.length === 0 ? <Empty text="Comece a conversa." /> : msgs.map((m, i) => {
                const me = m.from === user.email; const d = new Date(m.date);
                return (
                  <View key={i} style={{alignItems: me ? 'flex-end' : 'flex-start', marginBottom: 8}}>
                    <View style={{maxWidth: '80%', backgroundColor: me ? C.red : C.card, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8}}>
                      <Text style={{color: '#fff', fontSize: 15}}>{m.text}</Text>
                      <Text style={{color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2, alignSelf: 'flex-end'}}>{pad2(d.getHours())}:{pad2(d.getMinutes())}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={{flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.line}}>
              <TextInput value={txt} onChangeText={setTxt} onSubmitEditing={send} placeholder="Escreva uma mensagem…" placeholderTextColor={C.grayLight}
                style={{flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 16, color: C.ink}} />
              <TouchableOpacity onPress={send} style={{backgroundColor: C.red, borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center'}}><Text style={{color: '#fff', fontWeight: '800'}}>Enviar</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

/* ===================== GRAVADOR ===================== */
function buildDraft(type, durationSec, km, route) {
  const hrs = durationSec / 3600, met = type === 'bike' ? 7.5 : 9.8;
  return {
    id: uid(), type, duration: durationSec, distance: km,
    pace: type !== 'bike' && km > 0.02 ? paceStr(durationSec, km) : null,
    speed: type === 'bike' && hrs > 0 ? km / hrs : null,
    calories: Math.round(met * 75 * hrs), route, photos: [], caption: '',
  };
}
function Recorder({visible, onClose, onDone}) {
  const {width} = useWindowDimensions();
  const [type, setType] = useState(null);
  const [running, setRunning] = useState(false);
  const [, setTick] = useState(0);
  const [note, setNote] = useState('Toque em Iniciar para começar');
  const [askKm, setAskKm] = useState(false); const [km, setKm] = useState('');
  const r = useRef({startTs: 0, before: 0, gps: null, sub: null});

  useEffect(() => {
    if (!visible) return;
    setType(null); setRunning(false); setAskKm(false); setKm(''); setNote('Toque em Iniciar para começar');
    r.current = {startTs: 0, before: 0, gps: null, sub: null};
    TRACK.points = []; TRACK.distance = 0; TRACK.recording = false; TRACK.skipNext = false;
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => { clearInterval(t); stopGps(); };
  }, [visible]);

  const elapsed = () => r.current.before + (running ? (Date.now() - r.current.startTs) / 1000 : 0);

  async function startGps() {
    if (r.current.gps) return;
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') { setNote('Sem permissão de localização. Ative em Ajustes > PozzattClub.'); return; }
    let bg = {status: 'denied'};
    try { bg = await Location.requestBackgroundPermissionsAsync(); } catch (e) {}
    if (bg.status === 'granted') {
      try {
        await Location.startLocationUpdatesAsync(GPS_TASK, {
          accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000,
          pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
          activityType: Location.ActivityType.Fitness,
        });
        r.current.gps = 'task'; setNote('GPS ativo (grava com a tela bloqueada)'); return;
      } catch (e) {}
    }
    r.current.sub = await Location.watchPositionAsync(
      {accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000},
      loc => addPoint([loc.coords.latitude, loc.coords.longitude], loc.coords.accuracy));
    r.current.gps = 'watch'; setNote('GPS ativo (só com o app aberto — permita "Sempre" nos Ajustes)');
  }
  async function stopGps() {
    try { if (r.current.gps === 'task' && await Location.hasStartedLocationUpdatesAsync(GPS_TASK)) await Location.stopLocationUpdatesAsync(GPS_TASK); } catch (e) {}
    if (r.current.sub) { r.current.sub.remove(); r.current.sub = null; }
    r.current.gps = null; TRACK.recording = false;
  }
  async function start() {
    r.current.startTs = Date.now(); setRunning(true);
    if (type === 'esteira') return;
    TRACK.recording = true; TRACK.skipNext = true;
    await startGps();
  }
  async function pause() {
    r.current.before += (Date.now() - r.current.startTs) / 1000; setRunning(false);
    await stopGps();
  }
  async function finish() {
    let dur = elapsed();
    if (running) { r.current.before = dur; setRunning(false); }
    await stopGps();
    if (type === 'esteira') { r.current.before = dur; setAskKm(true); return; }
    onDone(buildDraft(type, dur, TRACK.distance / 1000, TRACK.points.slice()));
  }
  function confirmKm() {
    const v = parseFloat(km.replace(',', '.')) || 0;
    onDone(buildDraft('esteira', r.current.before, v, []));
  }
  function close() {
    if (running || elapsed() > 0) {
      Alert.alert('Sair do gravador', 'Descartar este treino?', [
        {text: 'Continuar', style: 'cancel'}, {text: 'Descartar', style: 'destructive', onPress: onClose}]);
    } else onClose();
  }

  const el = elapsed(), distKm = TRACK.distance / 1000;
  const mid = type === 'bike' ? (el > 0 ? (distKm / (el / 3600)).toFixed(1) : '0.0') : paceStr(el, distKm);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{flex: 1, backgroundColor: C.paper}}>
        <View style={{flexDirection: 'row', padding: 14}}>
          <TouchableOpacity onPress={close}><Text style={{color: C.ink, fontSize: 22}}>⌄</Text></TouchableOpacity>
        </View>
        {!type ? (
          <View style={{flex: 1, padding: 20}}>
            <Text style={{color: C.ink, fontWeight: '800', fontSize: 24, textTransform: 'uppercase', marginBottom: 18}}>Qual treino de hoje?</Text>
            {[['corrida', 'GPS · rota no mapa'], ['bike', 'GPS · rota no mapa'], ['esteira', 'Sem GPS · distância manual']].map(([t, sub]) => (
              <TouchableOpacity key={t} onPress={() => setType(t)} style={[cardStyle, {flexDirection: 'row', alignItems: 'center', gap: 14}]}>
                <Text style={{fontSize: 30}}>{TYPE_ICON[t]}</Text>
                <View><Text style={{color: C.ink, fontWeight: '800', fontSize: 17}}>{TYPE_LABEL[t]}</Text><Text style={{color: C.gray, fontSize: 13, marginTop: 2}}>{sub}</Text></View>
              </TouchableOpacity>
            ))}
          </View>
        ) : askKm ? (
          <KeyboardAvoidingView behavior="padding" style={{flex: 1, padding: 20, justifyContent: 'center'}}>
            <Text style={{color: C.ink, fontSize: 18, fontWeight: '800', marginBottom: 14, textAlign: 'center'}}>Quanto você percorreu?</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10}}>
              <TextInput value={km} onChangeText={setKm} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={C.grayLight} autoFocus
                style={{color: C.ink, fontSize: 40, fontWeight: '800', borderBottomWidth: 2, borderBottomColor: C.red, minWidth: 120, textAlign: 'center'}} />
              <Text style={{color: C.gray, fontSize: 20}}>km</Text>
            </View>
            <Btn title="Concluir treino" onPress={confirmKm} style={{marginTop: 30}} />
          </KeyboardAvoidingView>
        ) : (
          <View style={{flex: 1}}>
            <View style={{flex: 1, paddingHorizontal: 14, justifyContent: 'center'}}>
              {type !== 'esteira'
                ? <RouteView points={TRACK.points} width={width - 28} height={Math.min(width, 360)} />
                : <View style={{alignItems: 'center'}}><Text style={{fontSize: 64}}>🏃</Text><Text style={{color: C.gray}}>Esteira</Text></View>}
              {type !== 'esteira' && <Text style={{color: C.gray, fontSize: 12, textAlign: 'center', marginTop: 10}}>{note}</Text>}
            </View>
            <View style={[cardStyle, {marginHorizontal: 14, marginBottom: 0}]}>
              <View style={{flexDirection: 'row'}}>
                <View style={{flex: 1, alignItems: 'center'}}><Text style={{color: C.ink, fontSize: 32, fontWeight: '800'}}>{fmtClock(el)}</Text><Text style={{color: C.gray, fontSize: 12}}>Tempo</Text></View>
                {type !== 'esteira' && <View style={{flex: 1, alignItems: 'center'}}><Text style={{color: C.ink, fontSize: 32, fontWeight: '800'}}>{mid}</Text><Text style={{color: C.gray, fontSize: 12}}>{type === 'bike' ? 'km/h' : '/km'}</Text></View>}
                {type !== 'esteira' && <View style={{flex: 1, alignItems: 'center'}}><Text style={{color: C.ink, fontSize: 32, fontWeight: '800'}}>{distKm.toFixed(2)}</Text><Text style={{color: C.gray, fontSize: 12}}>km</Text></View>}
              </View>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 22}}>
              <View style={{width: 70, alignItems: 'center'}}><Text style={{fontSize: 26}}>{TYPE_ICON[type]}</Text><Text style={{color: C.gray, fontSize: 11, marginTop: 4}}>{TYPE_LABEL[type]}</Text></View>
              <View style={{alignItems: 'center'}}>
                <TouchableOpacity onPress={running ? pause : start} style={{width: 78, height: 78, borderRadius: 39, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center'}}>
                  {running
                    ? <Svg width={30} height={30} viewBox="0 0 24 24" fill="#fff"><Rect x={6} y={5} width={4} height={14} rx={1} /><Rect x={14} y={5} width={4} height={14} rx={1} /></Svg>
                    : <Svg width={30} height={30} viewBox="0 0 24 24" fill="#fff"><Path d="M8 5v14l11-7z" /></Svg>}
                </TouchableOpacity>
                <Text style={{color: C.gray, fontSize: 11, marginTop: 6}}>{running ? 'Pausar' : el > 0 ? 'Retomar' : 'Iniciar'}</Text>
              </View>
              <View style={{width: 70, alignItems: 'center'}}>
                <TouchableOpacity onPress={finish} style={{width: 48, height: 48, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center'}}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}><Path d="M6 3v18" /><Path d="M6 4h11l-2.5 3.5L17 11H6" /></Svg>
                </TouchableOpacity>
                <Text style={{color: C.gray, fontSize: 11, marginTop: 6}}>Finalizar</Text>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

/* ===================== RESUMO ===================== */
function Summary({draft, onDiscard, onSave}) {
  const {width} = useWindowDimensions();
  const [caption, setCaption] = useState(''); const [photos, setPhotos] = useState([]);
  useEffect(() => { setCaption(''); setPhotos([]); }, [draft && draft.id]);
  if (!draft) return null;
  async function add() {
    const more = await pickPhotos(4 - photos.length, 900, 0.6);
    setPhotos([...photos, ...more].slice(0, 4));
  }
  return (
    <Modal visible animationType="slide" onRequestClose={onDiscard}>
      <SafeAreaView style={{flex: 1, backgroundColor: C.paper}}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          <ScrollView contentContainerStyle={{padding: 16}} keyboardShouldPersistTaps="handled">
            <Section title="Resumo do treino" accent />
            {draft.route && draft.route.length > 1 && <RouteView points={draft.route} width={width - 32} height={200} />}
            <View style={{flexDirection: 'row', marginVertical: 16}}>
              {[[draft.distance.toFixed(2), 'km'], [fmtClock(draft.duration), 'tempo'], [draft.speed ? draft.speed.toFixed(1) : (draft.pace || '--:--'), draft.type === 'bike' ? 'km/h' : 'min/km'], [String(draft.calories), 'kcal']].map(([v, l], i) => (
                <View key={i} style={{flex: 1, alignItems: 'center'}}><Text style={{color: C.ink, fontSize: 20, fontWeight: '800'}}>{v}</Text><Text style={{color: C.gray, fontSize: 11}}>{l}</Text></View>
              ))}
            </View>
            <Field label="Legenda" value={caption} onChangeText={setCaption} multiline placeholder="Como foi o treino de hoje?" />
            <Text style={{fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: C.gray, marginBottom: 8}}>Fotos do treino</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
              {photos.map((ph, i) => (
                <View key={i}>
                  <Image source={{uri: ph}} style={{width: 78, height: 78, borderRadius: 10}} />
                  <TouchableOpacity onPress={() => setPhotos(photos.filter((_, j) => j !== i))} style={{position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center'}}><Text style={{color: '#fff', fontWeight: '800'}}>×</Text></TouchableOpacity>
                </View>
              ))}
              {photos.length < 4 && <TouchableOpacity onPress={add} style={{width: 78, height: 78, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center'}}><Text style={{color: C.gray, fontSize: 28}}>+</Text></TouchableOpacity>}
            </View>
          </ScrollView>
          <View style={{flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: C.line}}>
            <TouchableOpacity onPress={onDiscard} style={{flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingVertical: 14, alignItems: 'center'}}><Text style={{color: C.ink, fontWeight: '800'}}>Descartar</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onSave({...draft, caption: caption.trim(), photos})} style={{flex: 2, backgroundColor: C.red, borderRadius: 10, paddingVertical: 14, alignItems: 'center'}}><Text style={{color: '#fff', fontWeight: '800'}}>Salvar treino</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/* ===================== APP ===================== */
const NAV_ICONS = {
  feed: <Path d="M12 3l8 6.5V20a1 1 0 01-1 1h-5v-6.2h-4V21H5a1 1 0 01-1-1V9.5L12 3z" />,
  treinos: <><Rect x={5} y={4.5} width={14} height={16.5} rx={2} /><Path d="M8.5 11h7M8.5 14.3h7M8.5 17.6h4" /></>,
  grupos: <><Rect x={3.3} y={7.3} width={9.4} height={9.4} rx={1.3} transform="rotate(45 8 12)" /><Rect x={11.3} y={7.3} width={9.4} height={9.4} rx={1.3} transform="rotate(45 16 12)" /></>,
  perfil: <><Rect x={4.5} y={4.5} width={15} height={16.5} rx={2} /><Path d="M8 17v-3.2M12 17v-6.3M16 17V8.5" /></>,
};
const TAB_TITLES = {feed: 'Início', treinos: 'Treinos', grupos: 'Grupos', perfil: 'Você'};

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState({});
  const [tab, setTab] = useState('feed');
  const [rk, setRk] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showRec, setShowRec] = useState(false);
  const [draft, setDraft] = useState(null);
  const [badge, setBadge] = useState(0);
  const refresh = useCallback(() => setRk(x => x + 1), []);

  useEffect(() => {
    (async () => {
      const email = await sGet('session');
      if (email) { const u = await sGet('user:' + email); if (u) setUser(u); }
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const us = await sAll('user:'); const map = {}; us.forEach(u => { map[u.email] = u; }); setUsers(map);
      const posts = await sAll('post:');
      setBadge(sum(posts.filter(p => p.authorEmail === user.email), p => (p.likes || []).length + (p.comments || []).length));
    })();
  }, [user, rk]);

  async function login(u) { await sSet('session', u.email); setUser(u); setTab('feed'); }
  async function logout() { await sDel('session'); setUser(null); }
  async function updateUser(u) { setUser(u); refresh(); }
  async function savePost(p) {
    await sSet('post:' + p.id, {...p, authorEmail: user.email, authorName: user.name, date: new Date().toISOString(), likes: [], comments: []});
    setDraft(null); setTab('feed'); refresh();
  }

  if (!ready) return <View style={{flex: 1, backgroundColor: C.paper}} />;
  if (!user) return <SafeAreaView style={{flex: 1, backgroundColor: '#06070A'}}><StatusBar barStyle="light-content" /><AuthScreen onLogin={login} /></SafeAreaView>;

  const roundBtn = {width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center'};
  return (
    <AppCtx.Provider value={{user, users}}>
      <SafeAreaView style={{flex: 1, backgroundColor: C.paper}}>
        <StatusBar barStyle="light-content" />
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line}}>
          <TouchableOpacity onPress={() => setTab('perfil')}><Avatar name={user.name} photo={user.photo} size={36} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSearch(true)} style={roundBtn}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={2}><Circle cx={11} cy={11} r={7} /><Path d="M21 21l-4.3-4.3" /></Svg>
          </TouchableOpacity>
          <Text style={{flex: 1, textAlign: 'center', color: C.ink, fontWeight: '800', fontSize: 17, textTransform: 'uppercase'}}>{TAB_TITLES[tab]}</Text>
          <TouchableOpacity onPress={() => setShowChat(true)} style={roundBtn}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={2}><Path d="M21 11.5a8.4 8.4 0 01-8.9 8.4A9 9 0 013 15.2l-1 4.3 4.4-1a8.4 8.4 0 016-2.5A8.4 8.4 0 0121 11.5z" /></Svg>
          </TouchableOpacity>
          <View style={roundBtn}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={2}><Path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><Path d="M13.7 21a2 2 0 01-3.4 0" /></Svg>
            {badge > 0 && <View style={{position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3}}><Text style={{color: '#fff', fontSize: 10, fontWeight: '800'}}>{badge > 99 ? '99+' : badge}</Text></View>}
          </View>
        </View>

        <View style={{flex: 1}}>
          {tab === 'feed' && <Feed rk={rk} refresh={refresh} />}
          {tab === 'treinos' && <Treinos rk={rk} refresh={refresh} />}
          {tab === 'grupos' && <Grupos rk={rk} />}
          {tab === 'perfil' && <Perfil rk={rk} refresh={refresh} onLogout={logout} onUserChange={updateUser} />}
        </View>

        <View style={{flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.paper, paddingTop: 8, paddingBottom: 4}}>
          {['feed', 'treinos', 'rec', 'grupos', 'perfil'].map(k => {
            if (k === 'rec') return (
              <TouchableOpacity key={k} onPress={() => setShowRec(true)} style={{flex: 1, alignItems: 'center', gap: 3}}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke={C.red} strokeWidth={2} /><Circle cx={12} cy={12} r={4.5} fill={C.red} /></Svg>
                <Text style={{color: C.red, fontSize: 10, fontWeight: '700'}}>Gravar</Text>
              </TouchableOpacity>
            );
            const on = tab === k;
            return (
              <TouchableOpacity key={k} onPress={() => setTab(k)} style={{flex: 1, alignItems: 'center', gap: 3}}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill={k === 'feed' && on ? C.ink : 'none'} stroke={on ? C.ink : C.gray} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{NAV_ICONS[k]}</Svg>
                <Text style={{color: on ? C.ink : C.gray, fontSize: 10, fontWeight: '700'}}>{TAB_TITLES[k]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SearchModal visible={showSearch} onClose={() => setShowSearch(false)} rk={rk} refresh={refresh} />
        <ChatModal visible={showChat} onClose={() => setShowChat(false)} />
        <Recorder visible={showRec} onClose={() => setShowRec(false)} onDone={d => { setShowRec(false); setTimeout(() => setDraft(d), 400); }} />
        {draft && <Summary draft={draft} onDiscard={() => setDraft(null)} onSave={savePost} />}
      </SafeAreaView>
    </AppCtx.Provider>
  );
}
