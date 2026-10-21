import React, {useState, useEffect, useRef, useCallback, createContext, useContext} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, Share, StatusBar,
  KeyboardAvoidingView, Platform, Modal, useWindowDimensions,
} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import Svg, {Path, Circle, Polyline, Rect, Line, Defs, LinearGradient, Stop} from 'react-native-svg';
import {useFonts, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold} from '@expo-google-fonts/barlow-condensed';
import {JetBrainsMono_500Medium} from '@expo-google-fonts/jetbrains-mono';

/* ============================================================
   TEMA
   ============================================================ */
const C = {
  bg: '#F3F4F7', surface: '#FFFFFF', surface2: '#F0F1F5', surface3: '#E4E6EC',
  border: 'rgba(15,23,42,0.08)', borderStrong: 'rgba(15,23,42,0.18)',
  text: '#0E1116', text2: '#4B5262', text3: '#8B92A1',
  accent: '#FF5A1F', accentSoft: 'rgba(255,90,31,0.12)',
  lime: '#12A150', limeSoft: 'rgba(18,161,80,0.12)', blue: '#3B6EF5',
  overlay: 'rgba(255,255,255,0.92)',
};
/* Fontes da marca: Barlow Condensed (títulos e números) e JetBrains Mono (rótulos) */
const F = {display: null, mono: null};
const NUM = {fontVariant: ['tabular-nums']};
const TYPE_LABEL = {corrida: 'Corrida', bike: 'Bike', esteira: 'Esteira'};
const TYPE_ICON = {corrida: 'run', bike: 'bike', esteira: 'gauge'};
const TYPE_COLOR = {corrida: C.accent, bike: C.lime, esteira: C.blue};

/* ============================================================
   ÍCONES (SVG, sem emojis)
   ============================================================ */
const ICONS = {
  home: [['p', 'M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z']],
  clipboard: [['r', 8, 2, 8, 4, 1], ['p', 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'], ['p', 'M9 12h6M9 16h4']],
  users: [['p', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'], ['c', 9, 7, 4], ['p', 'M22 21v-2a4 4 0 0 0-3-3.87'], ['p', 'M16 3.13a4 4 0 0 1 0 7.75']],
  user: [['p', 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'], ['c', 12, 7, 4]],
  search: [['c', 11, 11, 7], ['p', 'm21 21-4.3-4.3']],
  bell: [['p', 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'], ['p', 'M10.3 21a1.94 1.94 0 0 0 3.4 0']],
  message: [['p', 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z']],
  heart: [['p', 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z']],
  share: [['p', 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8'], ['p', 'm16 6-4-4-4 4'], ['p', 'M12 2v13']],
  plus: [['p', 'M5 12h14M12 5v14']],
  x: [['p', 'M18 6 6 18M6 6l12 12']],
  check: [['p', 'M20 6 9 17l-5-5']],
  chevL: [['p', 'm15 18-6-6 6-6']],
  chevR: [['p', 'm9 18 6-6-6-6']],
  chevD: [['p', 'm6 9 6 6 6-6']],
  flame: [['p', 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z']],
  pin: [['p', 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'], ['c', 12, 10, 3]],
  camera: [['p', 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'], ['c', 12, 13, 3]],
  clock: [['c', 12, 12, 9], ['p', 'M12 7v5l3 2']],
  flag: [['p', 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'], ['p', 'M4 22v-7']],
  edit: [['p', 'M12 20h9'], ['p', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z']],
  logout: [['p', 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'], ['p', 'm16 17 5-5-5-5'], ['p', 'M21 12H9']],
  trash: [['p', 'M3 6h18'], ['p', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'], ['p', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2']],
  more: [['c', 5, 12, 1.3, 1], ['c', 12, 12, 1.3, 1], ['c', 19, 12, 1.3, 1]],
  gauge: [['p', 'm12 14 4-4'], ['p', 'M3.34 19a10 10 0 1 1 17.32 0']],
  bike: [['c', 18.5, 17.5, 3.5], ['c', 5.5, 17.5, 3.5], ['c', 15, 5, 1], ['p', 'M12 17.5V14l-3-3 4-3 2 3h2']],
  run: [['c', 15, 4.2, 1.9], ['p', 'M13.2 8.4 10.8 14'], ['p', 'M13.4 8.6 17 11.2 19.6 10'], ['p', 'M13 9.2 9.4 10.4 7.6 13.2'], ['p', 'M10.8 14 14.6 16.6 14 21'], ['p', 'M10.8 14 8.4 17.6 4.8 17.4']],
  play: [['p', 'M7 4.5v15l12-7.5z', 1]],
  pause: [['r', 6, 4.5, 4, 15, 1, 1], ['r', 14, 4.5, 4, 15, 1, 1]],
  rec: [['c', 12, 12, 9.5], ['c', 12, 12, 4.8, 1]],
  image: [['r', 3, 3, 18, 18, 2], ['c', 9, 9, 2], ['p', 'm21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21']],
  trophy: [['p', 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6'], ['p', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18'], ['p', 'M4 22h16'], ['p', 'M18 2H6v7a6 6 0 0 0 12 0V2Z'], ['p', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22'], ['p', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22']],
  bolt: [['p', 'M13 2 3 14h9l-1 8 10-12h-9l1-8z']],
};
function Ico({n, s = 22, c = C.text, w = 1.9}) {
  const d = ICONS[n] || [];
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {d.map((e, i) => {
        if (e[0] === 'p') return <Path key={i} d={e[1]} fill={e[2] ? c : 'none'} />;
        if (e[0] === 'c') return <Circle key={i} cx={e[1]} cy={e[2]} r={e[3]} fill={e[4] ? c : 'none'} />;
        return <Rect key={i} x={e[1]} y={e[2]} width={e[3]} height={e[4]} rx={e[5] || 0} fill={e[6] ? c : 'none'} />;
      })}
    </Svg>
  );
}

/* ============================================================
   ARMAZENAMENTO LOCAL (dados e fotos ficam no aparelho)
   ============================================================ */
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
/* Fotos: guardadas como arquivos (o AsyncStorage do Android tem limite de 6 MB) */
const DOC = FileSystem.documentDirectory;
const photoUri = p => (!p ? null : p.startsWith('photos/') ? DOC + p : p);
async function savePhotoFile(uri) {
  try { await FileSystem.makeDirectoryAsync(DOC + 'photos/', {intermediates: true}); } catch (e) {}
  const name = 'photos/' + uid() + '.jpg';
  await FileSystem.copyAsync({from: uri, to: DOC + name});
  return name;
}
async function deletePhotoFiles(list) {
  for (const p of list || []) { if (p && p.startsWith('photos/')) { try { await FileSystem.deleteAsync(DOC + p, {idempotent: true}); } catch (e) {} } }
}
async function pickPhotos(limit, maxW, quality) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Permissão necessária', 'Libere o acesso às fotos nos Ajustes do aparelho.'); return []; }
  const r = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], allowsMultipleSelection: limit > 1, selectionLimit: limit, quality: 1});
  if (r.canceled) return [];
  const out = [];
  for (const a of r.assets.slice(0, limit)) {
    try {
      const m = await ImageManipulator.manipulateAsync(a.uri, [{resize: {width: maxW}}], {compress: quality, format: ImageManipulator.SaveFormat.JPEG});
      out.push(await savePhotoFile(m.uri));
    } catch (e) {}
  }
  return out;
}

/* ============================================================
   UTILIDADES
   ============================================================ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function hashPass(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
function nameColor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 45%, 42%)`;
}
const initials = n => n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const pad2 = n => String(n).padStart(2, '0');
const fmtDate = iso => { const d = new Date(iso); return `${pad2(d.getDate())} ${MESES[d.getMonth()]}`; };
function fmtClock(total) {
  total = Math.max(0, Math.floor(total));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}
function fmtLong(total) {
  total = Math.floor(total); const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${pad2(m)}min` : `${m}min`;
}
function fmtDateTime(iso) {
  const d = new Date(iso), now = new Date();
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return `Hoje, ${hm}`;
  if (d.toDateString() === y.toDateString()) return `Ontem, ${hm}`;
  return `${fmtDate(iso)}, ${hm}`;
}
function haversine(a, b) {
  const R = 6371000, rad = x => x * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function paceStr(sec, km) {
  if (!(km > 0.02)) return '--:--';
  const pm = (sec / 60) / km; let m = Math.floor(pm), s = Math.round((pm % 1) * 60);
  if (s === 60) { m += 1; s = 0; }
  return `${m}:${pad2(s)}`;
}
function mondayOf(d) {
  const x = new Date(d); const day = x.getDay() || 7;
  if (day !== 1) x.setDate(x.getDate() - (day - 1));
  x.setHours(0, 0, 0, 0); return x;
}
function weekStreak(mine) {
  const weeks = new Set(mine.map(p => mondayOf(new Date(p.date)).toDateString()));
  let n = 0; const cur = mondayOf(new Date());
  if (!weeks.has(cur.toDateString())) cur.setDate(cur.getDate() - 7);
  while (weeks.has(cur.toDateString())) { n++; cur.setDate(cur.getDate() - 7); }
  return n;
}
function autoTitle(type, iso) {
  const h = new Date(iso).getHours();
  const per = h < 5 ? 'de madrugada' : h < 12 ? 'pela manhã' : h < 18 ? 'à tarde' : 'à noite';
  const base = type === 'bike' ? 'Pedal' : type === 'esteira' ? 'Treino na esteira' : 'Corrida';
  return `${base} ${per}`;
}
const pairKey = (a, b) => [a, b].sort().join('~');
const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
function downsample(pts, max = 700) {
  if (pts.length <= max) return pts;
  const step = pts.length / max, out = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.floor(i * step)]);
  out.push(pts[pts.length - 1]); return out;
}

/* ============================================================
   GPS (primeiro e segundo plano)
   ============================================================ */
const GPS_TASK = 'pozzattclub-gps';
const TRACK = {points: [], distance: 0, recording: false, skipNext: false, lastFix: 0};
function addPoint(p, acc) {
  TRACK.lastFix = Date.now();
  if (!TRACK.recording) return;
  if (acc && acc > 65) return;
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

/* ============================================================
   MAPA (tiles escuros reais, com rota por cima)
   ============================================================ */
const TS = 256;
const mx = (lon, z) => (lon + 180) / 360 * Math.pow(2, z) * TS;
const my = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z) * TS; };
function fitView(points, w, h, pad) {
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const p of points) {
    if (p[0] < minLat) minLat = p[0]; if (p[0] > maxLat) maxLat = p[0];
    if (p[1] < minLon) minLon = p[1]; if (p[1] > maxLon) maxLon = p[1];
  }
  for (let z = 17; z >= 2; z--) {
    const dx = mx(maxLon, z) - mx(minLon, z), dy = my(minLat, z) - my(maxLat, z);
    if (dx <= w - pad * 2 && dy <= h - pad * 2) return {z, cx: (mx(minLon, z) + mx(maxLon, z)) / 2, cy: (my(minLat, z) + my(maxLat, z)) / 2};
  }
  return {z: 2, cx: mx(minLon, 2), cy: my(maxLat, 2)};
}
function TileMap({points, width, height, center, zoom, marker, pad = 34, radius = 0, fade = false, attribution = true}) {
  let z, cx, cy;
  if (center) { z = zoom || 16; cx = mx(center[1], z); cy = my(center[0], z); }
  else if (points && points.length > 1) { const f = fitView(points, width, height, pad); z = f.z; cx = f.cx; cy = f.cy; }
  else { z = 4; cx = mx(-46.63, z); cy = my(-23.55, z); }
  const ox = cx - width / 2, oy = cy - height / 2, n = Math.pow(2, z);
  const x0 = Math.floor(ox / TS), x1 = Math.floor((ox + width) / TS), y0 = Math.floor(oy / TS), y1 = Math.floor((oy + height) / TS);
  const tiles = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (ty < 0 || ty >= n) continue;
    const wx = ((tx % n) + n) % n;
    tiles.push(
      <Image key={z + '/' + tx + '/' + ty}
        source={{uri: `https://${'abcd'[(wx + ty) % 4]}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${wx}/${ty}@2x.png`}}
        style={{position: 'absolute', left: tx * TS - ox, top: ty * TS - oy, width: TS, height: TS}} />
    );
  }
  const proj = p => [mx(p[1], z) - ox, my(p[0], z) - oy];
  const xy = points && points.length > 1 ? points.map(proj) : [];
  const line = xy.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
  const mk = marker ? proj(marker) : null;
  const grid = [];
  for (let i = 0; i < width; i += 44) grid.push(<Line key={'v' + i} x1={i} y1={0} x2={i} y2={height} stroke="rgba(15,23,42,0.05)" strokeWidth={1} />);
  for (let j = 0; j < height; j += 44) grid.push(<Line key={'h' + j} x1={0} y1={j} x2={width} y2={j} stroke="rgba(15,23,42,0.05)" strokeWidth={1} />);
  return (
    <View style={{width, height, overflow: 'hidden', backgroundColor: '#E9ECF1', borderRadius: radius}}>
      <Svg width={width} height={height} style={{position: 'absolute'}}>{grid}</Svg>
      {tiles}
      <Svg width={width} height={height} style={{position: 'absolute'}} pointerEvents="none">
        {fade && (
          <>
            <Defs><LinearGradient id="fd" x1="0" y1="0" x2="0" y2="1"><Stop offset="0.55" stopColor={C.bg} stopOpacity="0" /><Stop offset="1" stopColor={C.bg} stopOpacity="0.95" /></LinearGradient></Defs>
            <Rect x={0} y={0} width={width} height={height} fill="url(#fd)" />
          </>
        )}
        {xy.length > 1 && <Polyline points={line} fill="none" stroke="#FFFFFF" strokeOpacity={0.95} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />}
        {xy.length > 1 && <Polyline points={line} fill="none" stroke={C.accent} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />}
        {xy.length > 1 && <Circle cx={xy[0][0]} cy={xy[0][1]} r={6} fill={C.lime} stroke="#FFFFFF" strokeWidth={3} />}
        {xy.length > 1 && !marker && <Circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r={6.5} fill="#fff" stroke={C.accent} strokeWidth={3.5} />}
        {mk && <Circle cx={mk[0]} cy={mk[1]} r={16} fill={C.accent} fillOpacity={0.22} />}
        {mk && <Circle cx={mk[0]} cy={mk[1]} r={7.5} fill={C.accent} stroke="#fff" strokeWidth={3} />}
      </Svg>
      {attribution && <Text style={{position: 'absolute', right: 8, bottom: 5, fontSize: 8.5, color: 'rgba(15,23,42,0.55)'}}>© OpenStreetMap · © CARTO</Text>}
    </View>
  );
}

/* ============================================================
   CONTEXTO E COMPONENTES BASE
   ============================================================ */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const Tx = ({style, d, m, ...p}) => {
  const st = [{color: C.text}, style];
  if (d && F.display) st.push({fontFamily: F.display, fontWeight: 'normal'});
  else if (m && F.mono) st.push({fontFamily: F.mono, fontWeight: 'normal'});
  return <Text {...p} style={st} />;
};
function Screen({children, style, bottom = true, bg = C.bg}) {
  const i = useSafeAreaInsets();
  return <View style={[{flex: 1, backgroundColor: bg, paddingTop: i.top, paddingBottom: bottom ? i.bottom : 0}, style]}>{children}</View>;
}
function Avatar({name, photo, size = 40}) {
  const uri = photoUri(photo);
  if (uri) return <Image source={{uri}} style={{width: size, height: size, borderRadius: size / 2, backgroundColor: C.surface2}} />;
  return (
    <View style={{width: size, height: size, borderRadius: size / 2, backgroundColor: nameColor(name || '?'), alignItems: 'center', justifyContent: 'center'}}>
      <Tx style={{color: '#fff', fontWeight: '700', fontSize: size * 0.38, letterSpacing: 0.3}}>{initials(name || '?')}</Tx>
    </View>
  );
}
function UserAvatar({email, name, size}) {
  const {users} = useApp();
  return <Avatar name={name} photo={users[email] && users[email].photo} size={size} />;
}
function Btn({title, onPress, kind = 'primary', icon, style, disabled}) {
  const bg = kind === 'primary' ? C.accent : kind === 'secondary' ? C.surface2 : 'transparent';
  const col = kind === 'primary' ? '#fff' : kind === 'secondary' ? C.text : C.text2;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={disabled}
      style={[{backgroundColor: bg, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: disabled ? 0.5 : 1}, kind === 'secondary' && {borderWidth: 1, borderColor: C.border}, style]}>
      {icon ? <Ico n={icon} s={18} c={col} /> : null}
      <Tx style={{color: col, fontWeight: '700', fontSize: 15, letterSpacing: 0.2}}>{title}</Tx>
    </TouchableOpacity>
  );
}
function Field({label, style, ...props}) {
  return (
    <View style={{marginBottom: 14}}>
      {label ? <Tx style={{fontSize: 12, fontWeight: '600', color: C.text2, marginBottom: 7}}>{label}</Tx> : null}
      <TextInput placeholderTextColor={C.text3} selectionColor={C.accent} {...props}
        style={[{backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: C.text}, props.multiline && {minHeight: 84, textAlignVertical: 'top', paddingTop: 13}, style]} />
    </View>
  );
}
function Label({children, style}) {
  return <Tx m style={[{fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, color: C.text3, textTransform: 'uppercase'}, style]}>{children}</Tx>;
}
function SectionHead({title, right}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12, paddingHorizontal: 2}}>
      <Label>{title}</Label>{right}
    </View>
  );
}
function Empty({icon = 'flag', title, text}) {
  return (
    <View style={{paddingVertical: 44, paddingHorizontal: 30, alignItems: 'center'}}>
      <View style={{width: 64, height: 64, borderRadius: 32, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: C.border}}>
        <Ico n={icon} s={26} c={C.text3} />
      </View>
      {title ? <Tx style={{fontWeight: '700', fontSize: 17, marginBottom: 6, textAlign: 'center'}}>{title}</Tx> : null}
      <Tx style={{color: C.text2, fontSize: 14, textAlign: 'center', lineHeight: 20}}>{text}</Tx>
    </View>
  );
}
function StatCell({label, value, unit, big, color}) {
  return (
    <View style={{flex: 1}}>
      <Label style={{marginBottom: 5}}>{label}</Label>
      <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
        <Tx d style={[NUM, {fontSize: big ? 42 : 31, fontWeight: '800', letterSpacing: 0, lineHeight: big ? 46 : 34}, color && {color}]}>{value}</Tx>
        {unit ? <Tx style={{fontSize: 12, fontWeight: '600', color: C.text2, marginLeft: 3}}>{unit}</Tx> : null}
      </View>
    </View>
  );
}
const card = {backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: {width: 0, height: 4}, elevation: 1};
function TypeChip({type, small}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface2, paddingHorizontal: small ? 9 : 11, paddingVertical: small ? 4 : 6, borderRadius: 20}}>
      <Ico n={TYPE_ICON[type] || 'run'} s={small ? 13 : 15} c={TYPE_COLOR[type] || C.accent} w={2.1} />
      <Tx style={{fontSize: small ? 11 : 12, fontWeight: '700', color: C.text2}}>{TYPE_LABEL[type] || type}</Tx>
    </View>
  );
}

/* ============================================================
   LOGIN
   ============================================================ */
function AuthScreen({onLogin}) {
  const {width, height} = useWindowDimensions();
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
      if (pass.length < 4) return setErr('Use uma senha com pelo menos 4 caracteres.');
      if (await sGet('user:' + em)) return setErr('Já existe uma conta com esse e-mail. Faça login.');
      const u = {name: name.trim(), email: em, hash: hashPass(pass), role, joined: new Date().toISOString()};
      await sSet('user:' + em, u); onLogin(u);
    } else {
      const u = await sGet('user:' + em);
      const ok = u && ((u.hash && u.hash === hashPass(pass)) || (u.pass && u.pass === pass));
      if (!ok) return setErr('E-mail ou senha incorretos.');
      if (u.pass) { delete u.pass; u.hash = hashPass(pass); await sSet('user:' + em, u); }
      onLogin(u);
    }
  }
  return (
    <Screen>
      <Svg width={width} height={height} style={{position: 'absolute', top: 0, left: 0}} pointerEvents="none">
        {[0, 1, 2, 3].map(i => (
          <Rect key={i} x={-width * 0.4 + i * 20} y={height * 0.05 + i * 20} width={width * 1.8 - i * 40} height={height * 0.46 - i * 40} rx={height * 0.23 - i * 20}
            fill="none" stroke="rgba(15,23,42,0.07)" strokeWidth={1.5} />
        ))}
      </Svg>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', padding: 26}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Tx m style={{color: C.accent, fontSize: 11, fontWeight: '800', letterSpacing: 2.4, marginBottom: 12}}>CLUBE DE CORRIDA E TREINO</Tx>
          <Tx d style={{fontSize: 78, fontWeight: '900', letterSpacing: -1, lineHeight: 76}}>POZZATT</Tx>
          <Tx d style={{fontSize: 78, fontWeight: '900', letterSpacing: -1, lineHeight: 78, color: C.accent}}>CLUB</Tx>
          <Tx style={{color: C.text2, fontSize: 15, lineHeight: 22, marginTop: 14, marginBottom: 30}}>Treine com o clube e registre cada quilômetro.</Tx>
          <View style={[card, {padding: 20}]}>
            <View style={{flexDirection: 'row', backgroundColor: C.bg, borderRadius: 12, padding: 4, marginBottom: 20}}>
              {[['login', 'Entrar'], ['register', 'Criar conta']].map(([m, l]) => (
                <TouchableOpacity key={m} onPress={() => {setMode(m); setErr('');}} style={{flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center', backgroundColor: mode === m ? C.surface3 : 'transparent'}}>
                  <Tx style={{color: mode === m ? C.text : C.text3, fontWeight: '700', fontSize: 14}}>{l}</Tx>
                </TouchableOpacity>
              ))}
            </View>
            {err ? <View style={{backgroundColor: C.accentSoft, borderRadius: 10, padding: 11, marginBottom: 14}}><Tx style={{color: C.accent, fontSize: 13, fontWeight: '600'}}>{err}</Tx></View> : null}
            {mode === 'register' && <Field label="Nome completo" value={name} onChangeText={setName} placeholder="Seu nome" />}
            <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Field label="Senha" value={pass} onChangeText={setPass} placeholder="Sua senha" secureTextEntry />
            {mode === 'register' && (
              <View style={{marginBottom: 16}}>
                <Tx style={{fontSize: 12, fontWeight: '600', color: C.text2, marginBottom: 7}}>Você é</Tx>
                <View style={{flexDirection: 'row', gap: 10}}>
                  {[['aluno', 'Aluno', 'user'], ['coach', 'Treinador', 'clipboard']].map(([r, l, ic]) => (
                    <TouchableOpacity key={r} onPress={() => setRole(r)} style={{flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: role === r ? C.accent : C.border, backgroundColor: role === r ? C.accentSoft : C.surface2}}>
                      <Ico n={ic} s={17} c={role === r ? C.accent : C.text2} />
                      <Tx style={{color: role === r ? C.text : C.text2, fontWeight: '700', fontSize: 14}}>{l}</Tx>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <Btn title={mode === 'login' ? 'Entrar' : 'Criar conta'} onPress={submit} style={{marginTop: 4}} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/* ============================================================
   CARD DE TREINO
   ============================================================ */
function PostCard({p, onChange}) {
  const {user} = useApp();
  const {width} = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');
  const liked = (p.likes || []).includes(user.email);
  const photos = p.photos || [];
  const isMine = p.authorEmail === user.email;
  const hasRoute = p.route && p.route.length > 1;
  const mediaW = width - 32 - 2;
  const col = TYPE_COLOR[p.type] || C.accent;
  const km = p.distance ? p.distance.toFixed(2) : '0.00';
  const third = p.type === 'bike' ? ['Velocidade', p.speed ? p.speed.toFixed(1) : '0.0', 'km/h'] : ['Ritmo', p.pace || '--:--', '/km'];

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
      {text: 'Excluir', style: 'destructive', onPress: async () => { await deletePhotoFiles(photos); await sDel('post:' + p.id); onChange(); }},
    ]);
  }
  function share() {
    Share.share({message: `${autoTitle(p.type, p.date)}\n${km} km · ${fmtClock(p.duration)} · ${third[1]} ${third[2]}\n${p.authorName} no PozzattClub`});
  }
  return (
    <View style={[card, {marginBottom: 16, overflow: 'hidden'}]}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12}}>
        <UserAvatar email={p.authorEmail} name={p.authorName} size={42} />
        <View style={{flex: 1}}>
          <Tx style={{fontWeight: '700', fontSize: 15}}>{p.authorName}</Tx>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3}}>
            <Ico n={TYPE_ICON[p.type] || 'run'} s={13} c={col} w={2.2} />
            <Tx style={{color: C.text2, fontSize: 12.5}}>{fmtDateTime(p.date)}</Tx>
          </View>
        </View>
        {isMine && <TouchableOpacity onPress={del} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}><Ico n="trash" s={19} c={C.text3} /></TouchableOpacity>}
      </View>
      <View style={{paddingHorizontal: 16, paddingBottom: 14}}>
        <Tx d style={{fontSize: 29, fontWeight: '800', textTransform: 'uppercase', lineHeight: 32}}>{autoTitle(p.type, p.date)}</Tx>
        {p.caption ? <Tx style={{color: C.text2, fontSize: 14.5, marginTop: 6, lineHeight: 21}}>{p.caption}</Tx> : null}
      </View>
      <View style={{flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16}}>
        <StatCell label="Distância" value={km} unit="km" />
        <StatCell label="Tempo" value={fmtClock(p.duration)} />
        <StatCell label={third[0]} value={third[1]} unit={third[2]} />
      </View>
      {hasRoute && <TileMap points={p.route} width={mediaW} height={190} />}
      {photos.length > 0 && (
        <View style={{flexDirection: 'row', gap: 2, marginTop: hasRoute ? 2 : 0}}>
          {photos.slice(0, 3).map((ph, i) => (
            <Image key={i} source={{uri: photoUri(ph)}} style={{flex: 1, height: photos.length === 1 ? 260 : 150, backgroundColor: C.surface2}} resizeMode="cover" />
          ))}
        </View>
      )}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 24, padding: 16}}>
        <TouchableOpacity onPress={like} style={{flexDirection: 'row', alignItems: 'center', gap: 7}} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Svg width={23} height={23} viewBox="0 0 24 24" fill={liked ? C.accent : 'none'} stroke={liked ? C.accent : C.text2} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <Path d={ICONS.heart[0][1]} />
          </Svg>
          <Tx style={{color: liked ? C.accent : C.text2, fontWeight: '700', fontSize: 14}}>{(p.likes || []).length || ''}</Tx>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setOpen(!open)} style={{flexDirection: 'row', alignItems: 'center', gap: 7}} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Ico n="message" s={22} c={open ? C.text : C.text2} />
          <Tx style={{color: C.text2, fontWeight: '700', fontSize: 14}}>{(p.comments || []).length || ''}</Tx>
        </TouchableOpacity>
        <View style={{flex: 1}} />
        <TouchableOpacity onPress={share} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}><Ico n="share" s={21} c={C.text2} /></TouchableOpacity>
      </View>
      {open && (
        <View style={{paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14}}>
          {(p.comments || []).length === 0 && <Tx style={{color: C.text3, fontSize: 13, marginBottom: 10}}>Nenhum comentário ainda.</Tx>}
          {(p.comments || []).map((cm, i) => (
            <View key={i} style={{flexDirection: 'row', gap: 10, marginBottom: 12}}>
              <UserAvatar email={cm.email} name={cm.author} size={28} />
              <View style={{flex: 1}}>
                <Tx style={{fontWeight: '700', fontSize: 13}}>{cm.author} <Tx style={{color: C.text3, fontWeight: '400', fontSize: 11.5}}>{fmtDateTime(cm.date)}</Tx></Tx>
                <Tx style={{color: C.text2, fontSize: 14, marginTop: 2, lineHeight: 20}}>{cm.text}</Tx>
              </View>
            </View>
          ))}
          <View style={{flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center'}}>
            <TextInput value={txt} onChangeText={setTxt} placeholder="Escreva um comentário" placeholderTextColor={C.text3} onSubmitEditing={comment} returnKeyType="send"
              style={{flex: 1, backgroundColor: C.surface2, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: C.text}} />
            <TouchableOpacity onPress={comment} style={{backgroundColor: C.accent, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'}}>
              <Ico n="chevR" s={20} c="#fff" w={2.4} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/* ============================================================
   INÍCIO
   ============================================================ */
function WeekCard({mine}) {
  const letters = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const monday = mondayOf(new Date());
  const active = new Set(mine.map(p => new Date(p.date).toDateString()));
  const today = new Date().toDateString();
  const streak = weekStreak(mine);
  const wk = mine.filter(p => mondayOf(new Date(p.date)).getTime() === monday.getTime());
  return (
    <View style={[card, {padding: 18, marginBottom: 18}]}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
          <View style={{width: 44, height: 44, borderRadius: 14, backgroundColor: streak > 0 ? C.accentSoft : C.surface2, alignItems: 'center', justifyContent: 'center'}}>
            <Ico n="flame" s={24} c={streak > 0 ? C.accent : C.text3} />
          </View>
          <View>
            <Tx d style={[NUM, {fontSize: 34, fontWeight: '800', lineHeight: 36}]}>{streak} <Tx style={{fontSize: 14, fontWeight: '600', color: C.text2}}>{streak === 1 ? 'semana seguida' : 'semanas seguidas'}</Tx></Tx>
            <Tx style={{color: C.text3, fontSize: 12, marginTop: 1}}>Treine ao menos uma vez por semana</Tx>
          </View>
        </View>
      </View>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18}}>
        {letters.map((l, i) => {
          const d = new Date(monday); d.setDate(monday.getDate() + i);
          const on = active.has(d.toDateString()); const isT = d.toDateString() === today;
          return (
            <View key={i} style={{alignItems: 'center', gap: 7}}>
              <Tx style={{color: C.text3, fontSize: 11, fontWeight: '700'}}>{l}</Tx>
              <View style={{width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.accent : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: isT ? C.text : C.border}}>
                {on ? <Ico n="check" s={17} c="#fff" w={2.8} /> : <Tx style={[NUM, {color: isT ? C.text : C.text3, fontSize: 13, fontWeight: '600'}]}>{d.getDate()}</Tx>}
              </View>
            </View>
          );
        })}
      </View>
      <View style={{flexDirection: 'row', paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border}}>
        <StatCell label="Esta semana" value={sum(wk, p => p.distance).toFixed(1)} unit="km" />
        <StatCell label="Tempo" value={fmtLong(sum(wk, p => p.duration))} />
        <StatCell label="Treinos" value={String(wk.length)} />
      </View>
    </View>
  );
}
function Feed({rk, refresh}) {
  const {user} = useApp();
  const [posts, setPosts] = useState(null);
  useEffect(() => { sAll('post:').then(a => setPosts(a.sort((x, y) => new Date(y.date) - new Date(x.date)))); }, [rk]);
  if (!posts) return <View style={{flex: 1}} />;
  const mine = posts.filter(p => p.authorEmail === user.email);
  return (
    <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 30}} showsVerticalScrollIndicator={false}>
      <WeekCard mine={mine} />
      {posts.length === 0
        ? <Empty icon="run" title="Nenhum treino ainda" text={'Seja o primeiro do clube a gravar um treino hoje. Toque no botão central para começar.'} />
        : posts.map(p => <PostCard key={p.id} p={p} onChange={refresh} />)}
    </ScrollView>
  );
}

/* ============================================================
   TREINOS DO COACH
   ============================================================ */
function Treinos({rk, refresh}) {
  const {user} = useApp();
  const [list, setList] = useState(null);
  const [title, setTitle] = useState(''); const [type, setType] = useState('corrida');
  const [dayIdx, setDayIdx] = useState(0); const [desc, setDesc] = useState('');
  const isCoach = user.role === 'coach';
  const days = Array.from({length: 8}, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); d.setHours(12, 0, 0, 0); return d; });
  useEffect(() => { sAll('workout:').then(a => setList(a.sort((x, y) => new Date(y.date) - new Date(x.date)))); }, [rk]);
  async function create() {
    if (!title.trim() || !desc.trim()) return Alert.alert('Atenção', 'Preencha o título e a descrição do treino.');
    const id = uid();
    await sSet('workout:' + id, {id, title: title.trim(), type, date: days[dayIdx].toISOString(), description: desc.trim(), createdBy: user.email, createdByName: user.name, completedBy: []});
    setTitle(''); setDesc(''); setDayIdx(0); refresh();
  }
  async function toggleDone(id) {
    const w = await sGet('workout:' + id); if (!w) return;
    w.completedBy = w.completedBy || [];
    const i = w.completedBy.indexOf(user.email);
    if (i >= 0) w.completedBy.splice(i, 1); else w.completedBy.push(user.email);
    await sSet('workout:' + id, w); refresh();
  }
  function delWorkout(id) {
    Alert.alert('Excluir treino', 'Remover este treino para todo o clube?', [
      {text: 'Cancelar', style: 'cancel'}, {text: 'Excluir', style: 'destructive', onPress: async () => { await sDel('workout:' + id); refresh(); }}]);
  }
  if (!list) return <View style={{flex: 1}} />;
  return (
    <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 30}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {isCoach && (
        <View style={[card, {padding: 18}]}>
          <Tx d style={{fontWeight: '800', fontSize: 25, marginBottom: 16, textTransform: 'uppercase'}}>Novo treino para o clube</Tx>
          <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex.: Tiros de 400 m x 8" />
          <Tx style={{fontSize: 12, fontWeight: '600', color: C.text2, marginBottom: 7}}>Modalidade</Tx>
          <View style={{flexDirection: 'row', gap: 8, marginBottom: 14}}>
            {Object.keys(TYPE_LABEL).map(t => (
              <TouchableOpacity key={t} onPress={() => setType(t)} style={{flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: type === t ? TYPE_COLOR[t] : C.border, backgroundColor: type === t ? C.surface3 : C.surface2}}>
                <Ico n={TYPE_ICON[t]} s={20} c={type === t ? TYPE_COLOR[t] : C.text3} />
                <Tx style={{fontSize: 12, fontWeight: '700', color: type === t ? C.text : C.text2}}>{TYPE_LABEL[t]}</Tx>
              </TouchableOpacity>
            ))}
          </View>
          <Tx style={{fontSize: 12, fontWeight: '600', color: C.text2, marginBottom: 7}}>Dia do treino</Tx>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 14, marginHorizontal: -4}}>
            {days.map((d, i) => (
              <TouchableOpacity key={i} onPress={() => setDayIdx(i)} style={{marginHorizontal: 4, width: 56, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: dayIdx === i ? C.accent : C.surface2}}>
                <Tx style={{fontSize: 11, fontWeight: '700', color: dayIdx === i ? '#fff' : C.text3}}>{i === 0 ? 'Hoje' : DIAS_CURTOS[d.getDay()]}</Tx>
                <Tx d style={[NUM, {fontSize: 24, fontWeight: '800', marginTop: 0, color: dayIdx === i ? '#fff' : C.text}]}>{d.getDate()}</Tx>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Field label="Descrição" value={desc} onChangeText={setDesc} multiline placeholder="Aquecimento, séries, ritmo-alvo, volta à calma…" />
          <Btn title="Publicar para o clube" onPress={create} />
        </View>
      )}
      <SectionHead title={isCoach ? 'Treinos publicados' : 'Treinos do clube'} />
      {list.length === 0
        ? <Empty icon="clipboard" title="Nenhum treino por aqui" text={isCoach ? 'Publique o primeiro treino do clube no formulário acima.' : 'Seu treinador ainda não publicou nenhum treino.'} />
        : list.map(w => {
          const done = (w.completedBy || []).includes(user.email); const col = TYPE_COLOR[w.type] || C.accent;
          return (
            <View key={w.id} style={[card, {marginBottom: 14, flexDirection: 'row', overflow: 'hidden'}]}>
              <View style={{width: 4, backgroundColor: col}} />
              <View style={{flex: 1, padding: 16}}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12}}>
                  <TypeChip type={w.type} small />
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
                    <Tx style={{color: C.text3, fontSize: 12, fontWeight: '600'}}>{fmtDate(w.date)}</Tx>
                    {isCoach && w.createdBy === user.email && <TouchableOpacity onPress={() => delWorkout(w.id)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}><Ico n="trash" s={17} c={C.text3} /></TouchableOpacity>}
                  </View>
                </View>
                <Tx d style={{fontSize: 25, fontWeight: '800', textTransform: 'uppercase', lineHeight: 28}}>{w.title}</Tx>
                <Tx style={{color: C.text2, fontSize: 14.5, lineHeight: 21, marginTop: 8}}>{w.description}</Tx>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16}}>
                  <Tx style={{color: C.text3, fontSize: 12}}>Por {w.createdByName}</Tx>
                  {isCoach
                    ? <Tx style={{color: C.text2, fontSize: 12.5, fontWeight: '700'}}>{(w.completedBy || []).length} {(w.completedBy || []).length === 1 ? 'concluiu' : 'concluíram'}</Tx>
                    : <TouchableOpacity onPress={() => toggleDone(w.id)} style={{flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: done ? C.lime : C.surface2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9}}>
                      <Ico n="check" s={15} c={done ? '#fff' : C.text2} w={2.6} />
                      <Tx style={{color: done ? '#fff' : C.text, fontWeight: '800', fontSize: 12.5}}>{done ? 'Concluído' : 'Marcar como feito'}</Tx>
                    </TouchableOpacity>}
                </View>
              </View>
            </View>
          );
        })}
    </ScrollView>
  );
}

/* ============================================================
   CLUBE (ranking)
   ============================================================ */
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
      }));
    })();
  }, [rk]);
  if (!rows) return <View style={{flex: 1}} />;
  const alunos = rows.filter(r => r.u.role !== 'coach').sort((a, b) => b.week - a.week || b.total - a.total);
  const coaches = rows.filter(r => r.u.role === 'coach');
  const max = Math.max(1, ...alunos.map(r => r.week));
  const medal = ['#E0A800', '#8E97A8', '#C07A3E'];
  return (
    <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 30}} showsVerticalScrollIndicator={false}>
      <View style={[card, {padding: 18}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6}}>
          <Ico n="trophy" s={20} c={C.accent} />
          <Tx d style={{fontWeight: '800', fontSize: 25, textTransform: 'uppercase'}}>Ranking da semana</Tx>
        </View>
        <Tx style={{color: C.text3, fontSize: 12.5, marginBottom: 14}}>Quilômetros nos últimos 7 dias</Tx>
        {alunos.length === 0 ? <Empty icon="users" text="Nenhum aluno cadastrado ainda." /> : alunos.map((r, i) => {
          const me = r.u.email === user.email;
          return (
            <View key={r.u.email} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.border}}>
              <Tx d style={[NUM, {width: 24, textAlign: 'center', fontWeight: '800', fontSize: 22, color: i < 3 && r.week > 0 ? medal[i] : C.text3}]}>{i + 1}</Tx>
              <Avatar name={r.u.name} photo={r.u.photo} size={42} />
              <View style={{flex: 1}}>
                <Tx style={{fontWeight: '700', fontSize: 15}}>{r.u.name}{me ? <Tx style={{color: C.accent, fontWeight: '700'}}>  você</Tx> : null}</Tx>
                <View style={{height: 5, backgroundColor: C.surface2, borderRadius: 3, marginTop: 8, overflow: 'hidden'}}>
                  <View style={{width: `${Math.max(2, (r.week / max) * 100)}%`, height: 5, backgroundColor: me ? C.accent : C.text3, borderRadius: 3}} />
                </View>
                <Tx style={{color: C.text3, fontSize: 11.5, marginTop: 6}}>{r.count} {r.count === 1 ? 'treino' : 'treinos'} · {r.total.toFixed(1)} km no total</Tx>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <Tx d style={[NUM, {fontWeight: '800', fontSize: 28, lineHeight: 30}]}>{r.week.toFixed(1)}</Tx>
                <Tx style={{color: C.text3, fontSize: 11, fontWeight: '600'}}>km</Tx>
              </View>
            </View>
          );
        })}
      </View>
      <SectionHead title="Equipe técnica" />
      {coaches.length === 0 ? <Empty icon="clipboard" text="Nenhum treinador cadastrado ainda." /> : coaches.map(r => (
        <View key={r.u.email} style={[card, {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10}]}>
          <Avatar name={r.u.name} photo={r.u.photo} size={46} />
          <View style={{flex: 1}}>
            <Tx style={{fontWeight: '700', fontSize: 15}}>{r.u.name}</Tx>
            <Tx style={{color: C.text3, fontSize: 12.5, marginTop: 2}}>{r.u.location || 'Treinador do clube'}</Tx>
          </View>
          <View style={{backgroundColor: C.accentSoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4}}><Tx style={{color: C.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.5}}>COACH</Tx></View>
        </View>
      ))}
    </ScrollView>
  );
}

/* ============================================================
   PERFIL
   ============================================================ */
function BarChart({posts, weeks = 8}) {
  const mon = mondayOf(new Date()); const buckets = Array(weeks).fill(0);
  posts.forEach(p => {
    const diff = Math.round((mon - mondayOf(new Date(p.date))) / (7 * 86400000));
    if (diff >= 0 && diff < weeks) buckets[weeks - 1 - diff] += p.distance || 0;
  });
  const max = Math.max(1, ...buckets), H = 112;
  return (
    <View>
      <View style={{flexDirection: 'row', alignItems: 'flex-end', height: H, gap: 8}}>
        {buckets.map((v, i) => (
          <View key={i} style={{flex: 1, height: H, alignItems: 'center', justifyContent: 'flex-end'}}>
            {v > 0 && <Tx m style={[NUM, {fontSize: 9.5, color: C.text2, fontWeight: '700', marginBottom: 4}]}>{v.toFixed(v >= 10 ? 0 : 1)}</Tx>}
            <View style={{width: '100%', height: Math.max(4, (v / max) * (H - 20)), borderRadius: 6, backgroundColor: v === 0 ? C.surface3 : i === weeks - 1 ? C.accent : 'rgba(255,90,31,0.38)'}} />
          </View>
        ))}
      </View>
      <View style={{flexDirection: 'row', gap: 8, marginTop: 8}}>
        {buckets.map((_, i) => {
          const d = new Date(mon); d.setDate(mon.getDate() - 7 * (weeks - 1 - i));
          return <Tx key={i} m style={[NUM, {flex: 1, textAlign: 'center', fontSize: 8.5, color: i === weeks - 1 ? C.text : C.text3, fontWeight: '600'}]}>{pad2(d.getDate())}/{pad2(d.getMonth() + 1)}</Tx>;
        })}
      </View>
    </View>
  );
}
function MonthCalendar({mine}) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const act = {}; mine.forEach(p => { act[new Date(p.date).toDateString()] = p.type; });
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(<View key={'e' + i} style={{width: '14.2857%', height: 42}} />);
  for (let d = 1; d <= days; d++) {
    const key = new Date(y, m, d).toDateString(); const a = act[key]; const isT = key === now.toDateString();
    cells.push(
      <View key={d} style={{width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center'}}>
        <View style={{width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: a ? TYPE_COLOR[a] : 'transparent', borderWidth: isT && !a ? 1.5 : 0, borderColor: C.text}}>
          <Tx style={[NUM, {fontSize: 13, fontWeight: a ? '800' : '500', color: a ? '#fff' : isT ? C.text : C.text2}]}>{d}</Tx>
        </View>
      </View>
    );
  }
  const sk = weekStreak(mine);
  return (
    <View style={[card, {padding: 16, marginTop: 14}]}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
        <Tx d style={{fontWeight: '800', fontSize: 22, textTransform: 'uppercase'}}>{MESES_LONGOS[m]} {y}</Tx>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}><Ico n="flame" s={15} c={C.accent} /><Tx style={{color: C.text2, fontSize: 12.5, fontWeight: '700'}}>{sk} {sk === 1 ? 'semana' : 'semanas'}</Tx></View>
      </View>
      <View style={{flexDirection: 'row'}}>{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => <Tx key={i} style={{width: '14.2857%', textAlign: 'center', color: C.text3, fontSize: 11, fontWeight: '700'}}>{l}</Tx>)}</View>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 4}}>{cells}</View>
    </View>
  );
}
function Perfil({rk, refresh, onLogout, onUserChange}) {
  const {user} = useApp();
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
    const r = await pickPhotos(1, 360, 0.8);
    if (!r.length) return;
    const old = user.photo; const u = {...user, photo: r[0]};
    await sSet('user:' + u.email, u); if (old) deletePhotoFiles([old]); onUserChange(u);
  }
  const filtered = filter === 'todos' ? mine : mine.filter(p => p.type === filter);
  const wkStart = mondayOf(new Date()).getTime();
  const wk = filtered.filter(p => new Date(p.date).getTime() >= wkStart);
  const search = q.trim().toLowerCase();
  const acts = !search ? mine : mine.filter(p => `${TYPE_LABEL[p.type] || ''} ${autoTitle(p.type, p.date)} ${p.caption || ''} ${p.distance ? p.distance.toFixed(1) + 'km' : ''}`.toLowerCase().includes(search));
  return (
    <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 40}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
        <TouchableOpacity onPress={changeAvatar} activeOpacity={0.8}>
          <Avatar name={user.name} photo={user.photo} size={84} />
          <View style={{position: 'absolute', right: -2, bottom: -2, backgroundColor: C.accent, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg}}><Ico n="camera" s={13} c="#fff" w={2.2} /></View>
        </TouchableOpacity>
        <View style={{flex: 1}}>
          <Tx d style={{fontWeight: '800', fontSize: 34, textTransform: 'uppercase', lineHeight: 36}}>{user.name}</Tx>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5}}>
            <Ico n={user.role === 'coach' ? 'clipboard' : 'user'} s={14} c={C.accent} />
            <Tx style={{color: C.text2, fontSize: 13.5, fontWeight: '600'}}>{user.role === 'coach' ? 'Treinador' : 'Aluno'} · PozzattClub</Tx>
          </View>
          {user.location ? <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4}}><Ico n="pin" s={14} c={C.text3} /><Tx style={{color: C.text3, fontSize: 13}}>{user.location}</Tx></View> : null}
        </View>
      </View>
      {user.bio ? <Tx style={{color: C.text2, fontSize: 14.5, lineHeight: 21, marginTop: 16}}>{user.bio}</Tx> : null}
      <View style={[card, {flexDirection: 'row', padding: 16, marginTop: 18}]}>
        <StatCell label="Treinos" value={String(mine.length)} />
        <StatCell label="Distância" value={sum(mine, p => p.distance).toFixed(0)} unit="km" />
        <StatCell label="Tempo" value={fmtLong(sum(mine, p => p.duration))} />
      </View>
      <Btn kind="secondary" title={edit ? 'Fechar edição' : 'Editar perfil'} icon="edit" onPress={() => setEdit(!edit)} style={{marginTop: 12, height: 46}} />
      {edit && (
        <View style={[card, {padding: 16, marginTop: 12}]}>
          <Field label="Nome" value={nm} onChangeText={setNm} />
          <Field label="Cidade" value={loc} onChangeText={setLoc} placeholder="Cidade, Estado" />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline placeholder="Conte um pouco sobre você" />
          <Btn title="Salvar alterações" onPress={saveProfile} />
        </View>
      )}
      <View style={{flexDirection: 'row', marginTop: 22, borderBottomWidth: 1, borderBottomColor: C.border}}>
        {[['progresso', 'Progresso'], ['treinos', 'Concluídos'], ['atividades', 'Atividades']].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setTab(k)} style={{flex: 1, alignItems: 'center', paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: tab === k ? C.accent : 'transparent', marginBottom: -1}}>
            <Tx style={{color: tab === k ? C.text : C.text3, fontWeight: '700', fontSize: 14}}>{l}</Tx>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'progresso' && (
        <View style={{marginTop: 16}}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginHorizontal: -16}} contentContainerStyle={{paddingHorizontal: 16, gap: 8}}>
            {[['todos', 'Todos', null], ['corrida', 'Corrida', 'run'], ['bike', 'Bike', 'bike'], ['esteira', 'Esteira', 'gauge']].map(([k, l, ic]) => (
              <TouchableOpacity key={k} onPress={() => setFilter(k)} style={{flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 22, backgroundColor: filter === k ? C.text : C.surface2}}>
                {ic ? <Ico n={ic} s={15} c={filter === k ? '#fff' : C.text2} w={2.1} /> : null}
                <Tx style={{color: filter === k ? '#fff' : C.text2, fontWeight: '700', fontSize: 13}}>{l}</Tx>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={[card, {padding: 16, marginTop: 16}]}>
            <Label style={{marginBottom: 14}}>Esta semana</Label>
            <View style={{flexDirection: 'row'}}>
              <StatCell label="Distância" value={sum(wk, p => p.distance).toFixed(1)} unit="km" big />
              <StatCell label="Tempo" value={fmtLong(sum(wk, p => p.duration))} big />
              <StatCell label="Treinos" value={String(wk.length)} big />
            </View>
          </View>
          <View style={[card, {padding: 16, marginTop: 14}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16}}>
              <Tx d style={{fontWeight: '800', fontSize: 22, textTransform: 'uppercase'}}>Últimas 8 semanas</Tx>
              <Tx m style={[NUM, {color: C.text2, fontSize: 11.5, fontWeight: '600'}]}>{sum(filtered, p => p.distance).toFixed(1)} km no total</Tx>
            </View>
            <BarChart posts={filtered} />
          </View>
          <MonthCalendar mine={filtered} />
        </View>
      )}
      {tab === 'treinos' && (
        <View style={{marginTop: 4}}>
          {done.length === 0
            ? <Empty icon="clipboard" title="Nada concluído ainda" text="Na aba Treinos, marque como feito os treinos que o seu treinador publicar." />
            : done.map(w => (
              <View key={w.id} style={[card, {flexDirection: 'row', overflow: 'hidden', marginTop: 14}]}>
                <View style={{width: 4, backgroundColor: C.lime}} />
                <View style={{flex: 1, padding: 16}}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                    <TypeChip type={w.type} small /><Tx style={{color: C.text3, fontSize: 12, fontWeight: '600'}}>{fmtDate(w.date)}</Tx>
                  </View>
                  <Tx d style={{fontSize: 24, fontWeight: '800', textTransform: 'uppercase', lineHeight: 26}}>{w.title}</Tx>
                  <Tx style={{color: C.text2, fontSize: 14, lineHeight: 20, marginTop: 6}}>{w.description}</Tx>
                </View>
              </View>
            ))}
        </View>
      )}
      {tab === 'atividades' && (
        <View style={{marginTop: 16}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface2, borderRadius: 14, paddingHorizontal: 14, marginBottom: 16}}>
            <Ico n="search" s={18} c={C.text3} />
            <TextInput value={q} onChangeText={setQ} placeholder="Buscar nas suas atividades" placeholderTextColor={C.text3} style={{flex: 1, paddingVertical: 13, fontSize: 15, color: C.text}} />
          </View>
          {acts.length === 0 ? <Empty icon="run" title="Sem atividades" text="Os treinos que você gravar vão aparecer aqui." /> : acts.map(p => <PostCard key={p.id} p={p} onChange={refresh} />)}
        </View>
      )}
      <TouchableOpacity onPress={onLogout} style={{marginTop: 26, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 14}}>
        <Ico n="logout" s={18} c={C.accent} /><Tx style={{color: C.accent, fontWeight: '700', fontSize: 15}}>Sair da conta</Tx>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ============================================================
   BUSCA E CHAT
   ============================================================ */
function ModalHeader({title, onClose, back}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, height: 54, borderBottomWidth: 1, borderBottomColor: C.border}}>
      <TouchableOpacity onPress={onClose} style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}><Ico n={back ? 'chevL' : 'x'} s={24} /></TouchableOpacity>
      <Tx d style={{fontWeight: '800', fontSize: 24, textTransform: 'uppercase'}}>{title}</Tx>
    </View>
  );
}
function SearchModal({visible, onClose, rk, refresh}) {
  const [q, setQ] = useState(''); const [res, setRes] = useState([]);
  useEffect(() => { if (!visible) setQ(''); }, [visible]);
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Screen>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, height: 58, borderBottomWidth: 1, borderBottomColor: C.border}}>
          <TouchableOpacity onPress={onClose} style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}><Ico n="chevL" s={24} /></TouchableOpacity>
          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface2, borderRadius: 14, paddingHorizontal: 14, marginRight: 8}}>
            <Ico n="search" s={18} c={C.text3} />
            <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Buscar treinos, pessoas, distâncias" placeholderTextColor={C.text3} style={{flex: 1, paddingVertical: 11, fontSize: 15, color: C.text}} />
          </View>
        </View>
        <ScrollView contentContainerStyle={{padding: 16}} keyboardShouldPersistTaps="handled">
          {!q.trim() ? <Empty icon="search" title="Buscar no clube" text={'Procure por modalidade, distância ou nome. Por exemplo: "corrida 5km" ou "bike".'} />
            : res.length === 0 ? <Empty icon="search" title="Nada encontrado" text="Tente outro termo, como a modalidade ou a distância." />
              : res.map(p => <PostCard key={p.id} p={p} onChange={refresh} />)}
        </ScrollView>
      </Screen>
    </Modal>
  );
}
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
    setTimeout(() => scroll.current && scroll.current.scrollToEnd({animated: false}), 60);
  }, [with_]);
  useEffect(() => { load(); }, [load]);
  async function send() {
    const t = txt.trim(); if (!t || !with_) return;
    await sSet('msg:' + pairKey(user.email, with_.email) + ':' + uid(), {from: user.email, to: with_.email, text: t, date: new Date().toISOString()});
    setTxt(''); load();
  }
  const showBack = isCoach && with_;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Screen>
        <ModalHeader title={with_ ? with_.name : 'Mensagens'} onClose={() => (showBack ? setWith(null) : onClose())} back={showBack} />
        {!with_ ? (
          <ScrollView contentContainerStyle={{padding: 16}}>
            {others.length === 0 ? <Empty icon="message" text={isCoach ? 'Nenhum aluno cadastrado ainda.' : 'Ainda não há um treinador cadastrado no clube.'} />
              : others.map(u => (
                <TouchableOpacity key={u.email} onPress={() => setWith(u)} style={[card, {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10}]}>
                  <Avatar name={u.name} photo={u.photo} size={44} />
                  <Tx style={{fontWeight: '700', fontSize: 15, flex: 1}}>{u.name}</Tx>
                  <Ico n="chevR" s={18} c={C.text3} />
                </TouchableOpacity>
              ))}
          </ScrollView>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
            <ScrollView ref={scroll} contentContainerStyle={{padding: 16}}>
              {msgs.length === 0 ? <Empty icon="message" text="Comece a conversa." /> : msgs.map((m, i) => {
                const me = m.from === user.email; const d = new Date(m.date);
                return (
                  <View key={i} style={{alignItems: me ? 'flex-end' : 'flex-start', marginBottom: 8}}>
                    <View style={{maxWidth: '80%', backgroundColor: me ? C.accent : C.surface2, borderRadius: 18, borderBottomRightRadius: me ? 5 : 18, borderBottomLeftRadius: me ? 18 : 5, paddingHorizontal: 14, paddingVertical: 9}}>
                      <Tx style={{color: me ? '#fff' : C.text, fontSize: 15, lineHeight: 21}}>{m.text}</Tx>
                      <Tx style={[NUM, {color: me ? 'rgba(255,255,255,0.75)' : C.text3, fontSize: 10, marginTop: 3, alignSelf: 'flex-end'}]}>{pad2(d.getHours())}:{pad2(d.getMinutes())}</Tx>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={{flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'center'}}>
              <TextInput value={txt} onChangeText={setTxt} onSubmitEditing={send} placeholder="Escreva uma mensagem" placeholderTextColor={C.text3}
                style={{flex: 1, backgroundColor: C.surface2, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: C.text}} />
              <TouchableOpacity onPress={send} style={{backgroundColor: C.accent, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'}}><Ico n="chevR" s={22} c="#fff" w={2.4} /></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </Screen>
    </Modal>
  );
}

/* ============================================================
   GRAVADOR
   ============================================================ */
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
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState('pick');
  const [type, setType] = useState(null);
  const [running, setRunning] = useState(false);
  const [, setTick] = useState(0);
  const [count, setCount] = useState(0);
  const [here, setHere] = useState(null);
  const [note, setNote] = useState('');
  const [km, setKm] = useState('');
  const [map, setMap] = useState({w: 0, h: 0});
  const r = useRef({startTs: 0, before: 0, gps: null, sub: null, cd: null});

  useEffect(() => {
    if (!visible) return;
    setStage('pick'); setType(null); setRunning(false); setCount(0); setHere(null); setNote(''); setKm('');
    r.current = {startTs: 0, before: 0, gps: null, sub: null, cd: null};
    TRACK.points = []; TRACK.distance = 0; TRACK.recording = false; TRACK.skipNext = false; TRACK.lastFix = 0;
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => { clearInterval(t); if (r.current.cd) clearInterval(r.current.cd); stopGps(); };
  }, [visible]);

  useEffect(() => {
    if (!visible || !type || type === 'esteira') return;
    let alive = true;
    (async () => {
      try {
        const fg = await Location.requestForegroundPermissionsAsync();
        if (fg.status !== 'granted') { if (alive) setNote('Permita a localização para gravar a rota.'); return; }
        const pos = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
        if (alive) setHere([pos.coords.latitude, pos.coords.longitude]);
      } catch (e) { if (alive) setNote('Não foi possível obter sua localização. Verifique se o GPS está ligado.'); }
    })();
    return () => { alive = false; };
  }, [type, visible]);

  const elapsed = () => r.current.before + (running ? (Date.now() - r.current.startTs) / 1000 : 0);

  async function startGps() {
    if (r.current.gps) return;
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') { setNote('Sem permissão de localização. Ative nos Ajustes do aparelho.'); return; }
    try {
      const bgp = await Location.getBackgroundPermissionsAsync();
      if (bgp.status !== 'granted' && !(await sGet('askedBg'))) { await sSet('askedBg', true); await Location.requestBackgroundPermissionsAsync(); }
    } catch (e) {}
    try {
      await Location.startLocationUpdatesAsync(GPS_TASK, {
        accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000,
        pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.Fitness,
        foregroundService: {notificationTitle: 'PozzattClub', notificationBody: 'Gravando seu treino…', notificationColor: '#FF5A1F'},
      });
      r.current.gps = 'task'; setNote(''); return;
    } catch (e) {}
    try {
      r.current.sub = await Location.watchPositionAsync(
        {accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000},
        loc => addPoint([loc.coords.latitude, loc.coords.longitude], loc.coords.accuracy));
      r.current.gps = 'watch'; setNote('Mantenha o app aberto durante o treino.');
    } catch (e) { setNote('Não foi possível iniciar o GPS.'); }
  }
  async function stopGps() {
    try { if (r.current.gps === 'task' && await Location.hasStartedLocationUpdatesAsync(GPS_TASK)) await Location.stopLocationUpdatesAsync(GPS_TASK); } catch (e) {}
    if (r.current.sub) { try { r.current.sub.remove(); } catch (e) {} r.current.sub = null; }
    r.current.gps = null; TRACK.recording = false;
  }
  function begin() {
    r.current.startTs = Date.now(); setRunning(true);
    if (type === 'esteira') return;
    TRACK.recording = true; TRACK.skipNext = true;
    startGps();
  }
  function start() {
    if (r.current.before > 0) { begin(); return; }
    let n = 3; setCount(3);
    r.current.cd = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(r.current.cd); r.current.cd = null; setCount(0); begin(); } else setCount(n);
    }, 1000);
  }
  async function pause() {
    r.current.before += (Date.now() - r.current.startTs) / 1000; setRunning(false);
    await stopGps();
  }
  async function finish() {
    const dur = elapsed();
    r.current.before = dur; setRunning(false);
    await stopGps();
    if (type === 'esteira') { setStage('km'); return; }
    if (TRACK.distance < 10 && dur < 20) { Alert.alert('Treino muito curto', 'Grave um treino um pouco maior para salvar.'); return; }
    onDone(buildDraft(type, dur, TRACK.distance / 1000, downsample(TRACK.points.slice())));
  }
  function confirmKm() {
    const v = parseFloat(km.replace(',', '.')) || 0;
    onDone(buildDraft('esteira', r.current.before, v, []));
  }
  function close() {
    if (running || r.current.before > 0 || count > 0) {
      Alert.alert('Descartar treino?', 'O treino em andamento será perdido.', [
        {text: 'Continuar', style: 'cancel'}, {text: 'Descartar', style: 'destructive', onPress: onClose}]);
    } else onClose();
  }

  const el = elapsed(), pts = TRACK.points, distKm = TRACK.distance / 1000;
  const last = pts.length ? pts[pts.length - 1] : here;
  const fresh = running ? (Date.now() - TRACK.lastFix < 15000) : !!here;
  const mid = type === 'bike' ? (el > 0 ? (distKm / (el / 3600)).toFixed(1) : '0.0') : paceStr(el, distKm);
  const paused = !running && el > 0;
  const circleBtn = {width: 78, height: 78, borderRadius: 39, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center'};

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={{flex: 1, backgroundColor: C.bg}}>
        {stage === 'pick' && (
          <View style={{flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom}}>
            <View style={{flexDirection: 'row', alignItems: 'center', height: 54, paddingHorizontal: 8}}>
              <TouchableOpacity onPress={onClose} style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}><Ico n="x" s={24} /></TouchableOpacity>
            </View>
            <View style={{padding: 20}}>
              <Tx d style={{fontSize: 52, fontWeight: '900', textTransform: 'uppercase', lineHeight: 54}}>Novo treino</Tx>
              <Tx style={{color: C.text2, fontSize: 15, marginTop: 6, marginBottom: 26}}>Escolha a modalidade para começar a gravar.</Tx>
              {[['corrida', 'Corrida ao ar livre', 'GPS, rota no mapa, ritmo e distância'], ['bike', 'Bike', 'GPS, rota no mapa e velocidade média'], ['esteira', 'Esteira', 'Sem GPS. Você informa a distância no final']].map(([t, ti, sub]) => (
                <TouchableOpacity key={t} activeOpacity={0.8} onPress={() => { setType(t); setStage('run'); }} style={[card, {flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, marginBottom: 12}]}>
                  <View style={{width: 54, height: 54, borderRadius: 16, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center'}}><Ico n={TYPE_ICON[t]} s={28} c={TYPE_COLOR[t]} w={2} /></View>
                  <View style={{flex: 1}}>
                    <Tx d style={{fontWeight: '800', fontSize: 24, textTransform: 'uppercase'}}>{ti}</Tx>
                    <Tx style={{color: C.text2, fontSize: 13, marginTop: 3}}>{sub}</Tx>
                  </View>
                  <Ico n="chevR" s={20} c={C.text3} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {stage === 'km' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom}}>
            <View style={{flex: 1, padding: 24, justifyContent: 'center'}}>
              <Label style={{textAlign: 'center', marginBottom: 10}}>Treino na esteira</Label>
              <Tx d style={[NUM, {fontSize: 80, fontWeight: '800', textAlign: 'center', lineHeight: 84}]}>{fmtClock(r.current.before)}</Tx>
              <Tx style={{color: C.text2, fontSize: 16, textAlign: 'center', marginTop: 34, marginBottom: 14}}>Quantos quilômetros você percorreu?</Tx>
              <View style={{flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8}}>
                <TextInput value={km} onChangeText={setKm} keyboardType="decimal-pad" placeholder="0,0" placeholderTextColor={C.text3} autoFocus selectionColor={C.accent}
                  style={[NUM, {fontFamily: F.display || undefined, color: C.text, fontSize: 72, fontWeight: F.display ? 'normal' : '800', borderBottomWidth: 2, borderBottomColor: C.accent, minWidth: 130, textAlign: 'center', paddingVertical: 4}]} />
                <Tx style={{color: C.text2, fontSize: 22, fontWeight: '700'}}>km</Tx>
              </View>
              <Btn title="Concluir treino" onPress={confirmKm} style={{marginTop: 40}} />
            </View>
          </KeyboardAvoidingView>
        )}

        {stage === 'run' && (
          <View style={{flex: 1}}>
            <View style={{flex: 1}} onLayout={e => setMap({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})}>
              {type !== 'esteira' && map.w > 0 && (
                <TileMap points={pts} center={last || undefined} zoom={type === 'bike' ? 15 : 16} marker={last || undefined} width={map.w} height={map.h} />
              )}
              {type === 'esteira' && (
                <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                  <View style={{width: 120, height: 120, borderRadius: 60, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border}}><Ico n="gauge" s={52} c={C.blue} w={1.6} /></View>
                  <Tx style={{color: C.text2, fontSize: 14, marginTop: 18}}>Treino na esteira</Tx>
                </View>
              )}
              <View style={{position: 'absolute', top: insets.top + 8, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <TouchableOpacity onPress={close} style={{width: 44, height: 44, borderRadius: 22, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: {width: 0, height: 2}, elevation: 3}}><Ico n="x" s={22} /></TouchableOpacity>
                {type !== 'esteira' && (
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.overlay, paddingHorizontal: 14, height: 36, borderRadius: 18, shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: {width: 0, height: 2}, elevation: 3}}>
                    <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: fresh ? C.lime : '#E0A800'}} />
                    <Tx style={{fontSize: 12.5, fontWeight: '700'}}>{fresh ? (running ? 'GPS ativo' : 'GPS pronto') : 'Buscando GPS'}</Tx>
                  </View>
                )}
              </View>
              {note ? (
                <View style={{position: 'absolute', left: 12, right: 12, bottom: 38, backgroundColor: C.overlay, borderRadius: 12, padding: 12}}>
                  <Tx style={{fontSize: 12.5, color: C.text2, textAlign: 'center'}}>{note}</Tx>
                </View>
              ) : null}
            </View>
            <View style={{backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -26, paddingTop: 22, paddingHorizontal: 22, paddingBottom: insets.bottom + 18, borderTopWidth: 1, borderColor: C.border}}>
              <Tx d style={[NUM, {fontSize: 104, fontWeight: '800', textAlign: 'center', lineHeight: 104}]}>{fmtClock(el)}</Tx>
              <Label style={{textAlign: 'center', marginTop: 2, marginBottom: 18}}>{paused ? 'Pausado' : running ? 'Em andamento' : 'Tempo'}</Label>
              {type !== 'esteira' && (
                <View style={{flexDirection: 'row', paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, marginBottom: 20}}>
                  <View style={{flex: 1, alignItems: 'center'}}><Tx d style={[NUM, {fontSize: 46, fontWeight: '800', lineHeight: 48}]}>{distKm.toFixed(2)}</Tx><Label style={{marginTop: 4}}>Quilômetros</Label></View>
                  <View style={{width: 1, backgroundColor: C.border}} />
                  <View style={{flex: 1, alignItems: 'center'}}><Tx d style={[NUM, {fontSize: 46, fontWeight: '800', lineHeight: 48}]}>{mid}</Tx><Label style={{marginTop: 4}}>{type === 'bike' ? 'km/h' : 'Ritmo /km'}</Label></View>
                </View>
              )}
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, minHeight: 82}}>
                {paused && (
                  <TouchableOpacity onPress={finish} activeOpacity={0.8} style={{alignItems: 'center', gap: 8}}>
                    <View style={{width: 62, height: 62, borderRadius: 31, backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderStrong}}><Ico n="flag" s={24} /></View>
                    <Tx style={{fontSize: 12, fontWeight: '700', color: C.text2}}>Finalizar</Tx>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={running ? pause : start} activeOpacity={0.85} disabled={count > 0} style={circleBtn}>
                  <Ico n={running ? 'pause' : 'play'} s={32} c="#fff" w={1} />
                </TouchableOpacity>
              </View>
            </View>
            {count > 0 && (
              <View style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center'}}>
                <Tx d style={[NUM, {fontSize: 200, fontWeight: '900', color: C.accent, lineHeight: 210}]}>{count}</Tx>
                <Tx style={{color: C.text2, fontSize: 16, marginTop: 4}}>Prepare-se</Tx>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

/* ============================================================
   RESUMO DO TREINO
   ============================================================ */
function Summary({draft, onDiscard, onSave}) {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState(''); const [photos, setPhotos] = useState([]);
  useEffect(() => { setCaption(''); setPhotos([]); }, [draft && draft.id]);
  if (!draft) return null;
  const hasRoute = draft.route && draft.route.length > 1;
  async function add() {
    const more = await pickPhotos(4 - photos.length, 1100, 0.7);
    setPhotos([...photos, ...more].slice(0, 4));
  }
  function discard() {
    Alert.alert('Descartar treino?', 'Esse treino não será salvo.', [
      {text: 'Voltar', style: 'cancel'}, {text: 'Descartar', style: 'destructive', onPress: () => { deletePhotoFiles(photos); onDiscard(); }}]);
  }
  const third = draft.type === 'bike' ? ['Velocidade média', draft.speed ? draft.speed.toFixed(1) : '0.0', 'km/h'] : ['Ritmo médio', draft.pace || '--:--', '/km'];
  const heroH = hasRoute ? 300 : 170;
  return (
    <Modal visible animationType="slide" onRequestClose={discard} statusBarTranslucent>
      <View style={{flex: 1, backgroundColor: C.bg}}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 24}}>
            <View style={{height: heroH}}>
              {hasRoute
                ? <TileMap points={draft.route} width={width} height={heroH} fade pad={50} />
                : <View style={{flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center'}}><Ico n={TYPE_ICON[draft.type]} s={56} c={TYPE_COLOR[draft.type]} w={1.4} /></View>}
              <TouchableOpacity onPress={discard} style={{position: 'absolute', top: insets.top + 8, left: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: {width: 0, height: 2}, elevation: 3}}><Ico n="x" s={22} /></TouchableOpacity>
            </View>
            <View style={{paddingHorizontal: 20, marginTop: -6}}>
              <View style={{alignSelf: 'flex-start', marginBottom: 10}}><TypeChip type={draft.type} /></View>
              <Tx d style={{fontSize: 44, fontWeight: '900', textTransform: 'uppercase', lineHeight: 46}}>{autoTitle(draft.type, new Date().toISOString())}</Tx>
              <View style={[card, {flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, padding: 6}]}>
                {[['Distância', draft.distance.toFixed(2), 'km'], ['Tempo', fmtClock(draft.duration), ''], [third[0], third[1], third[2]], ['Energia (estimada)', String(draft.calories), 'kcal']].map(([l, v, u], i) => (
                  <View key={i} style={{width: '50%', padding: 14}}><StatCell label={l} value={v} unit={u} big /></View>
                ))}
              </View>
              <View style={{marginTop: 22}}>
                <Field label="Legenda" value={caption} onChangeText={setCaption} multiline placeholder="Como foi o treino de hoje?" />
              </View>
              <Tx style={{fontSize: 12, fontWeight: '600', color: C.text2, marginBottom: 10}}>Fotos do treino</Tx>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>
                {photos.map((ph, i) => (
                  <View key={i}>
                    <Image source={{uri: photoUri(ph)}} style={{width: 84, height: 84, borderRadius: 14, backgroundColor: C.surface2}} />
                    <TouchableOpacity onPress={() => { deletePhotoFiles([ph]); setPhotos(photos.filter((_, j) => j !== i)); }} style={{position: 'absolute', top: -7, right: -7, width: 24, height: 24, borderRadius: 12, backgroundColor: C.surface3, borderWidth: 1, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center'}}><Ico n="x" s={13} w={2.6} /></TouchableOpacity>
                  </View>
                ))}
                {photos.length < 4 && (
                  <TouchableOpacity onPress={add} style={{width: 84, height: 84, borderRadius: 14, borderWidth: 1.5, borderColor: C.borderStrong, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4}}>
                    <Ico n="camera" s={22} c={C.text2} /><Tx style={{fontSize: 11, color: C.text3, fontWeight: '600'}}>Adicionar</Tx>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
          <View style={{padding: 16, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg}}>
            <Btn title="Salvar treino" onPress={() => onSave({...draft, caption: caption.trim(), photos})} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ============================================================
   APP
   ============================================================ */
const TAB_TITLES = {feed: 'Início', treinos: 'Treinos', grupos: 'Clube', perfil: 'Perfil'};

function Root() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState({});
  const [tab, setTab] = useState('feed');
  const [rk, setRk] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showRec, setShowRec] = useState(false);
  const [draft, setDraft] = useState(null);
  const [notif, setNotif] = useState({total: 0, seen: 0, likes: 0, comments: 0});
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
      const posts = (await sAll('post:')).filter(p => p.authorEmail === user.email);
      const likes = sum(posts, p => (p.likes || []).length), comments = sum(posts, p => (p.comments || []).length);
      const seen = (await sGet('seen:' + user.email)) || 0;
      setNotif({total: likes + comments, seen, likes, comments});
    })();
  }, [user, rk]);

  async function login(u) { await sSet('session', u.email); setUser(u); setTab('feed'); }
  async function logout() { await sDel('session'); setUser(null); }
  async function updateUser(u) { setUser(u); refresh(); }
  async function savePost(p) {
    await sSet('post:' + p.id, {...p, authorEmail: user.email, authorName: user.name, date: new Date().toISOString(), likes: [], comments: []});
    setDraft(null); setTab('feed'); refresh();
  }
  async function openBell() {
    await sSet('seen:' + user.email, notif.total);
    setNotif({...notif, seen: notif.total});
    Alert.alert('Atividade nos seus treinos', notif.total === 0 ? 'Ainda não há kudos nem comentários nos seus treinos.' : `${notif.likes} ${notif.likes === 1 ? 'kudo' : 'kudos'} e ${notif.comments} ${notif.comments === 1 ? 'comentário' : 'comentários'} nos seus treinos.`);
  }

  if (!ready) return <View style={{flex: 1, backgroundColor: C.bg}} />;
  if (!user) return <><StatusBar barStyle="dark-content" backgroundColor="transparent" translucent /><AuthScreen onLogin={login} /></>;

  const badge = Math.max(0, notif.total - notif.seen);
  const tabs = [['feed', 'Início', 'home'], ['treinos', 'Treinos', 'clipboard'], ['rec', '', 'rec'], ['grupos', 'Clube', 'users'], ['perfil', 'Perfil', 'user']];
  return (
    <AppCtx.Provider value={{user, users}}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Screen bottom={false}>
        <View style={{flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 58}}>
          <Tx d style={{flex: 1, fontSize: 40, fontWeight: '900', textTransform: 'uppercase', lineHeight: 44}}>{TAB_TITLES[tab]}</Tx>
          <TouchableOpacity onPress={() => setShowSearch(true)} style={{width: 42, height: 42, alignItems: 'center', justifyContent: 'center'}}><Ico n="search" s={23} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowChat(true)} style={{width: 42, height: 42, alignItems: 'center', justifyContent: 'center'}}><Ico n="message" s={23} /></TouchableOpacity>
          <TouchableOpacity onPress={openBell} style={{width: 42, height: 42, alignItems: 'center', justifyContent: 'center'}}>
            <Ico n="bell" s={23} />
            {badge > 0 && <View style={{position: 'absolute', top: 4, right: 3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.bg}}><Tx style={[NUM, {color: '#fff', fontSize: 10, fontWeight: '800'}]}>{badge > 99 ? '99+' : badge}</Tx></View>}
          </TouchableOpacity>
        </View>

        <View style={{flex: 1}}>
          {tab === 'feed' && <Feed rk={rk} refresh={refresh} />}
          {tab === 'treinos' && <Treinos rk={rk} refresh={refresh} />}
          {tab === 'grupos' && <Grupos rk={rk} />}
          {tab === 'perfil' && <Perfil rk={rk} refresh={refresh} onLogout={logout} onUserChange={updateUser} />}
        </View>

        <View style={{flexDirection: 'row', alignItems: 'flex-end', backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, paddingBottom: insets.bottom + 6}}>
          {tabs.map(([k, label, ic]) => {
            if (k === 'rec') return (
              <View key={k} style={{flex: 1, alignItems: 'center'}}>
                <TouchableOpacity onPress={() => setShowRec(true)} activeOpacity={0.85} style={{width: 58, height: 58, borderRadius: 29, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginTop: -26, borderWidth: 4, borderColor: C.bg}}>
                  <Ico n="rec" s={28} c="#fff" w={2} />
                </TouchableOpacity>
                <Tx style={{color: C.accent, fontSize: 10.5, fontWeight: '700', marginTop: 3}}>Gravar</Tx>
              </View>
            );
            const on = tab === k;
            return (
              <TouchableOpacity key={k} onPress={() => setTab(k)} style={{flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2}}>
                <Ico n={ic} s={24} c={on ? C.text : C.text3} w={on ? 2.2 : 1.8} />
                <Tx style={{color: on ? C.text : C.text3, fontSize: 10.5, fontWeight: '700'}}>{label}</Tx>
              </TouchableOpacity>
            );
          })}
        </View>
      </Screen>

      <SearchModal visible={showSearch} onClose={() => setShowSearch(false)} rk={rk} refresh={refresh} />
      <ChatModal visible={showChat} onClose={() => setShowChat(false)} />
      <Recorder visible={showRec} onClose={() => setShowRec(false)} onDone={d => { setShowRec(false); setTimeout(() => setDraft(d), 450); }} />
      {draft && <Summary draft={draft} onDiscard={() => setDraft(null)} onSave={savePost} />}
    </AppCtx.Provider>
  );
}

export default function App() {
  const [loaded, fontError] = useFonts({BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold, JetBrainsMono_500Medium});
  if (loaded) { F.display = 'BarlowCondensed_800ExtraBold'; F.mono = 'JetBrainsMono_500Medium'; }
  if (!loaded && !fontError) return <View style={{flex: 1, backgroundColor: C.bg}} />;
  return <SafeAreaProvider><Root /></SafeAreaProvider>;
}
