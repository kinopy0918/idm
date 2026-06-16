/*!
 * IDM WOW — Making Dots Particle Engine v2
 * Three.js Points + custom GLSL shaders
 * Text morphing via offscreen canvas pixel sampling
 * Scroll-driven phase: chaos → IDM text → phrase → grid → convergence
 * Additive blending, glow via layered point sprites
 */
(function () {
  'use strict';

  /* ── Feature detect ── */
  var canvas = document.getElementById('main-canvas');
  if (!canvas || typeof THREE === 'undefined') {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  /* ── Renderer ── */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x06070d, 1);

  /* ── Scene / Camera ── */
  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  /* ── Responsive particle count ── */
  var isMobile   = window.innerWidth < 768;
  var isLowPower = (navigator.hardwareConcurrency || 8) <= 4;
  var COUNT      = isMobile ? 6000 : (isLowPower ? 12000 : 20000);
  var COUNT_F    = COUNT.toFixed(1); // for GLSL literal

  /* ── Text sampling (offscreen canvas) ── */
  function sampleText(text, fontStr, canvasW, canvasH) {
    var tc = document.createElement('canvas');
    tc.width = canvasW; tc.height = canvasH;
    var ctx = tc.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvasW * 0.5, canvasH * 0.5);
    var data = ctx.getImageData(0, 0, canvasW, canvasH).data;
    var pts = [];
    var step = isMobile ? 5 : 4;
    for (var y = 0; y < canvasH; y += step) {
      for (var x = 0; x < canvasW; x += step) {
        if (data[(y * canvasW + x) * 4 + 3] > 128) {
          pts.push(
            ((x / canvasW) - 0.5) * 10,
            (0.5 - y / canvasH) * 4,
            0
          );
        }
      }
    }
    // Fisher-Yates shuffle
    for (var i = Math.floor(pts.length / 3) - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var ai = i * 3, aj = j * 3;
      var tx = pts[ai], ty = pts[ai+1], tz = pts[ai+2];
      pts[ai] = pts[aj]; pts[ai+1] = pts[aj+1]; pts[ai+2] = pts[aj+2];
      pts[aj] = tx; pts[aj+1] = ty; pts[aj+2] = tz;
    }
    return pts;
  }

  var TW = 600, TH = 220;
  var t1Pts = sampleText('IDM',          'bold 160px Inter, sans-serif',   TW, TH);
  var t2Pts = sampleText('構想を、成果に変える。', '500 32px "Noto Serif JP", serif', TW, TH);

  /* ── Buffer data ── */
  var positions = new Float32Array(COUNT * 3);
  var targets1  = new Float32Array(COUNT * 3);
  var targets2  = new Float32Array(COUNT * 3);
  var randoms   = new Float32Array(COUNT * 3);
  var sizes     = new Float32Array(COUNT);
  var phases    = new Float32Array(COUNT);

  var t1Len = Math.floor(t1Pts.length / 3);
  var t2Len = Math.floor(t2Pts.length / 3);

  for (var i = 0; i < COUNT; i++) {
    // initial chaos sphere
    var theta = Math.random() * Math.PI * 2;
    var phi   = Math.acos(2 * Math.random() - 1);
    var r     = 3 + Math.random() * 3.5;
    positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = (Math.random() - 0.5) * 3;

    // random drift seeds
    randoms[i*3]   = (Math.random() - 0.5) * 8;
    randoms[i*3+1] = (Math.random() - 0.5) * 8;
    randoms[i*3+2] = (Math.random() - 0.5) * 2;

    sizes[i]  = 0.5 + Math.random() * 1.8;
    phases[i] = Math.random();

    // text target 1 — IDM
    if (t1Len > 0) {
      var ti1 = (i % t1Len) * 3;
      targets1[i*3]   = t1Pts[ti1]   + (Math.random()-0.5)*0.10;
      targets1[i*3+1] = t1Pts[ti1+1] + (Math.random()-0.5)*0.10;
      targets1[i*3+2] = (Math.random()-0.5)*0.6;
    } else {
      targets1[i*3]   = (Math.random()-0.5)*5;
      targets1[i*3+1] = (Math.random()-0.5)*2;
      targets1[i*3+2] = 0;
    }

    // text target 2 — phrase
    if (t2Len > 0) {
      var ti2 = (i % t2Len) * 3;
      targets2[i*3]   = t2Pts[ti2]   + (Math.random()-0.5)*0.06;
      targets2[i*3+1] = t2Pts[ti2+1] + (Math.random()-0.5)*0.06;
      targets2[i*3+2] = (Math.random()-0.5)*0.4;
    } else {
      targets2[i*3]   = (Math.random()-0.5)*6;
      targets2[i*3+1] = (Math.random()-0.5)*2;
      targets2[i*3+2] = 0;
    }
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aTarget1', new THREE.BufferAttribute(targets1, 3));
  geo.setAttribute('aTarget2', new THREE.BufferAttribute(targets2, 3));
  geo.setAttribute('aRandom',  new THREE.BufferAttribute(randoms, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));

  /* ── Vertex shader — COUNT embedded as string literal ── */
  var vertShader = [
    'uniform float uTime;',
    'uniform float uScroll;',
    'uniform vec2  uMouse;',
    'uniform float uDPR;',
    '',
    'attribute vec3  aTarget1;',
    'attribute vec3  aTarget2;',
    'attribute vec3  aRandom;',
    'attribute float aSize;',
    'attribute float aPhase;',
    '',
    'varying float vAlpha;',
    'varying vec3  vColor;',
    '',
    'float ease(float t){ return t*t*(3.0-2.0*t); }',
    'vec3 mix3(vec3 a, vec3 b, float t){ return a+(b-a)*clamp(t,0.0,1.0); }',
    '',
    'void main(){',
    '  float T = uTime;',
    '  float S = uScroll;',
    '',
    '  // breathing drift',
    '  vec3 breathe = vec3(',
    '    cos(T*0.22 + aPhase*4.1)*0.07,',
    '    sin(T*0.28 + aPhase*5.2)*0.07,',
    '    sin(T*0.16 + aPhase*2.3)*0.03',
    '  );',
    '',
    '  // mouse influence',
    '  vec2 mWorld = uMouse * vec2(5.0, 2.5);',
    '  float mD = length(mWorld - position.xy);',
    '  float mF = 1.0 - smoothstep(0.0, 2.5, mD);',
    '  vec3 mPush = vec3(-uMouse*0.4*mF, 0.0);',
    '',
    '  vec3 pos;',
    '  float alpha = 0.6;',
    '  float sz = aSize;',
    '',
    '  // -- Phase 0: chaos hero (S < 0.12) --',
    '  if(S < 0.12){',
    '    float t = S/0.12;',
    '    float sT = clamp((t - aPhase*0.3)/0.7, 0.0, 1.0);',
    '    pos = position + aRandom*0.10 + breathe + mPush;',
    '    alpha = 0.25 + 0.30*sT;',
    '    sz = aSize * (0.5 + 0.5*sT);',
    '',
    '  // -- Phase 1: assemble IDM (S 0.12 -> 0.28) --',
    '  }else if(S < 0.28){',
    '    float t = (S-0.12)/0.16;',
    '    float sT = clamp((t - aPhase*0.35)/0.65, 0.0, 1.0);',
    '    float eT = ease(sT);',
    '    vec3 fromP = position + aRandom*0.08 + breathe*(1.0-eT);',
    '    pos = mix3(fromP, aTarget1 + breathe*0.15, eT) + mPush*(1.0-eT);',
    '    alpha = 0.30 + 0.65*eT;',
    '    sz = aSize*(0.5 + 0.8*eT);',
    '',
    '  // -- Phase 2: hold IDM --',
    '  }else if(S < 0.38){',
    '    pos = aTarget1 + breathe*0.12 + mPush*0.25;',
    '    alpha = 0.92;',
    '    sz = aSize*1.25;',
    '',
    '  // -- Phase 3: IDM -> phrase transition (S 0.38 -> 0.55) --',
    '  }else if(S < 0.55){',
    '    float t = (S-0.38)/0.17;',
    '    float sT = clamp((t - aPhase*0.4)/0.6, 0.0, 1.0);',
    '    float eT = ease(sT);',
    '    // midpoint scatter',
    '    float scatter = clamp(eT*2.0, 0.0, 1.0);',
    '    float reform  = clamp(eT*2.0-1.0, 0.0, 1.0);',
    '    vec3 midP = mix3(aTarget1, aRandom*0.5, scatter) + breathe*0.2;',
    '    pos = mix3(midP, aTarget2 + breathe*0.1, reform) + mPush*(1.0-eT);',
    '    alpha = 0.65 + 0.25*(1.0 - abs(eT-0.5)*2.0);',
    '    sz = aSize*(1.0 + 0.4*sin(eT*3.14159));',
    '',
    '  // -- Phase 4: hold phrase (S 0.55 -> 0.70) --',
    '  }else if(S < 0.70){',
    '    pos = aTarget2 + breathe*0.06 + mPush*0.15;',
    '    alpha = 0.88;',
    '    sz = aSize*1.15;',
    '',
    '  // -- Phase 5: structure (S 0.70 -> 0.84) --',
    '  }else if(S < 0.84){',
    '    float t = (S-0.70)/0.14;',
    '    float eT = ease(t);',
    '    float idx = float(gl_VertexID);',
    '    float gW = 55.0;',
    '    float gH = ' + COUNT_F + ' / gW;',
    '    float col = mod(idx, gW);',
    '    float row = floor(idx / gW);',
    '    vec3 gridP = vec3(',
    '      (col/gW - 0.5)*9.0,',
    '      (row/gH - 0.5)*3.8,',
    '      sin(aPhase*6.28)*0.25',
    '    );',
    '    pos = mix3(aTarget2, gridP + breathe*0.04, eT) + mPush*(1.0-eT)*0.3;',
    '    alpha = 0.55 + 0.30*(1.0-eT);',
    '    sz = aSize*(1.0 - eT*0.25);',
    '',
    '  // -- Phase 6: convergence (S 0.84 -> 1.0) --',
    '  }else{',
    '    float t = (S-0.84)/0.16;',
    '    float sT = clamp((t - (1.0-aPhase)*0.5)/0.5, 0.0, 1.0);',
    '    float eT = ease(sT);',
    '    float idx = float(gl_VertexID);',
    '    float gW = 55.0;',
    '    float gH = ' + COUNT_F + ' / gW;',
    '    float col = mod(idx, gW);',
    '    float row = floor(idx / gW);',
    '    vec3 gridP = vec3(',
    '      (col/gW - 0.5)*9.0,',
    '      (row/gH - 0.5)*3.8,',
    '      sin(aPhase*6.28)*0.25',
    '    );',
    '    pos = mix3(gridP, vec3(0.0, -0.2, 0.0), eT);',
    '    alpha = (0.8 - eT*0.7)*(1.0-eT*0.5);',
    '    sz = aSize*(1.0 + eT*1.8)*(1.0-eT*0.7);',
    '  }',
    '',
    '  // color: cyan-blue to near-white based on height',
    '  float h = clamp((pos.y + 2.5) / 5.0, 0.0, 1.0);',
    '  vColor = mix(',
    '    vec3(0.0, 0.55, 0.85),',   // deep cyan
    '    vec3(0.85, 0.95, 1.0),',   // ice white
    '    h',
    '  );',
    '  // boost color during text phases',
    '  float textPhase = smoothstep(0.12, 0.28, S) - smoothstep(0.70, 0.84, S);',
    '  vColor = mix(vColor, vec3(0.0, 0.80, 1.0), textPhase * 0.45);',
    '',
    '  vAlpha = clamp(alpha, 0.0, 1.0);',
    '',
    '  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);',
    '  gl_PointSize = sz * (300.0 / -mvPos.z) * uDPR;',
    '  gl_Position  = projectionMatrix * mvPos;',
    '}'
  ].join('\n');

  var fragShader = [
    'varying float vAlpha;',
    'varying vec3  vColor;',
    'void main(){',
    '  vec2 uv = gl_PointCoord - 0.5;',
    '  float d = length(uv);',
    '  if(d > 0.5) discard;',
    '  float core = 1.0 - smoothstep(0.0, 0.22, d);',
    '  float halo = 1.0 - smoothstep(0.10, 0.50, d);',
    '  float a = (core * 0.88 + halo * 0.38) * vAlpha;',
    '  gl_FragColor = vec4(vColor, a);',
    '}'
  ].join('\n');

  /* ── Material ── */
  var mat = new THREE.ShaderMaterial({
    vertexShader:   vertShader,
    fragmentShader: fragShader,
    uniforms: {
      uTime:   { value: 0 },
      uScroll: { value: 0 },
      uMouse:  { value: new THREE.Vector2(0, 0) },
      uDPR:    { value: Math.min(window.devicePixelRatio, 2) }
    },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending
  });

  var points = new THREE.Points(geo, mat);
  scene.add(points);

  /* ── Atmospheric fog layer (Beppu nebula 湯けむり) ── */
  var fogCount = isMobile ? 60 : 180;
  var fogGeo   = new THREE.BufferGeometry();
  var fogP     = new Float32Array(fogCount * 3);
  var fogS     = new Float32Array(fogCount);
  for (var fi = 0; fi < fogCount; fi++) {
    fogP[fi*3]   = (Math.random() - 0.5) * 14;
    fogP[fi*3+1] = (Math.random() - 0.5) * 7;
    fogP[fi*3+2] = -1.5 - Math.random() * 2;
    fogS[fi]     = 2 + Math.random() * 4;
  }
  fogGeo.setAttribute('position', new THREE.BufferAttribute(fogP, 3));
  fogGeo.setAttribute('aSize',    new THREE.BufferAttribute(fogS, 1));

  var fogMat = new THREE.ShaderMaterial({
    vertexShader: [
      'attribute float aSize;',
      'uniform float uTime;',
      'varying float vA;',
      'void main(){',
      '  float d = sin(uTime*0.07 + position.x*0.4)*0.35;',
      '  vec3 p = position + vec3(d, cos(uTime*0.05+position.y*0.5)*0.18, 0.0);',
      '  vA = 0.03 + 0.025*sin(uTime*0.11+position.x*0.6);',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_PointSize = aSize * (450.0 / -mv.z);',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying float vA;',
      'void main(){',
      '  vec2 uv = gl_PointCoord - 0.5;',
      '  float d = length(uv);',
      '  if(d > 0.5) discard;',
      '  float a = (1.0 - d*2.0) * vA;',
      '  gl_FragColor = vec4(0.0, 0.50, 0.72, a);',
      '}'
    ].join('\n'),
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending
  });

  scene.add(new THREE.Points(fogGeo, fogMat));

  /* ── Resize ── */
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);
  onResize();

  /* ── Mouse ── */
  var mouse  = new THREE.Vector2(0, 0);
  var tMouse = new THREE.Vector2(0, 0);
  window.addEventListener('pointermove', function(e) {
    tMouse.x = (e.clientX / window.innerWidth)  * 2 - 1;
    tMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  /* ── Scroll ── */
  var rawScroll = 0, smoothScroll = 0;
  function updateScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    rawScroll = max > 0 ? window.scrollY / max : 0;
    var pb = document.getElementById('progressBar');
    if (pb) pb.style.width = (rawScroll * 100) + '%';
  }
  window.addEventListener('scroll', updateScroll, { passive: true });

  /* ── RAF loop ── */
  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    mouse.x += (tMouse.x - mouse.x) * 0.055;
    mouse.y += (tMouse.y - mouse.y) * 0.055;
    smoothScroll += (rawScroll - smoothScroll) * 0.035;

    mat.uniforms.uTime.value   = t;
    mat.uniforms.uScroll.value = smoothScroll;
    mat.uniforms.uMouse.value.copy(mouse);
    fogMat.uniforms.uTime.value = t;

    // subtle camera parallax
    camera.position.x += (-mouse.x * 0.12 - camera.position.x) * 0.025;
    camera.position.y += ( mouse.y * 0.07 - camera.position.y) * 0.025;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  window._idmParticlesReady = true;
})();
