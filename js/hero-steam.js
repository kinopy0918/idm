// =========================================================
// IDM Hero — 別府の湯けむり (GPU fragment-shader rising steam)
// Raw WebGL · fullscreen triangle · anisotropic FBM + curl warp
// Rising plumes that billow and dissipate · cursor-reactive.
// Navy/cool mist on white — refined (硬派), clearly hand-crafted.
// =========================================================
(function () {
  var canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var VERT =
    "attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos,0.0,1.0); }";

  var FRAG = [
    "precision highp float;",
    "uniform vec2 u_res;",
    "uniform float u_time;",
    "uniform vec2 u_mouse;",   // 0..1, y up
    "uniform float u_intro;",

    "float hash(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }",
    "float noise(vec2 p){",
    "  vec2 i=floor(p), f=fract(p);",
    "  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));",
    "  vec2 u=f*f*(3.0-2.0*f);",
    "  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);",
    "}",
    "float fbm(vec2 p){",
    "  float v=0.0, a=0.5;",
    "  for(int i=0;i<6;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; }",
    "  return v;",
    "}",

    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / u_res.xy;",
    "  float aspect = u_res.x / u_res.y;",
    "  vec2 p = vec2(uv.x*aspect, uv.y);",
    "  float t = u_time * 0.20;",

    // cursor influence in p-space
    "  vec2 m = vec2(u_mouse.x*aspect, u_mouse.y);",
    "  float infl = exp(-distance(p, m)*3.0);",

    // rising, vertically-stretched smoke coordinate (steam goes UP)
    "  vec2 sp = vec2(p.x*3.0, p.y*1.5 - t);",
    // turbulence warp, stronger as it rises -> wisps wander near the top
    "  float warpAmt = 0.25 + uv.y*1.15;",
    "  vec2 w = vec2( fbm(sp*1.1 + vec2(0.0,-t*0.6)),",
    "                 fbm(sp*1.1 + vec2(4.2,1.3) - vec2(0.0,t)) );",
    "  sp.x += (w.x-0.5)*warpAmt*2.2;",
    "  sp.y += (w.y-0.5)*warpAmt;",
    // cursor parts/swirls the steam
    "  sp += infl*0.7*vec2(sin(u_time*1.5 + p.y*8.0), cos(u_time*1.2 + p.x*8.0));",

    "  float d = fbm(sp*2.0);",                    // billowy body (rising via sp)
    "  d = smoothstep(0.30, 0.82, d);",            // contrast -> wisps
    // originate at bottom, dissipate toward the top
    "  float rise = smoothstep(1.5, -0.2, uv.y);",
    // keep mostly to the right (headline sits left)
    "  float horiz = 0.5 + 0.5*smoothstep(-0.1, 0.62, uv.x);",
    "  float density = d * rise * horiz * u_intro;",

    "  vec3 white  = vec3(1.0);",
    "  vec3 coolbg = vec3(0.80,0.85,0.93);",      // cool backdrop (for contrast)
    "  vec3 steam  = vec3(1.0);",                  // luminous white steam
    "  vec3 shadow = vec3(0.52,0.60,0.78);",       // soft plume shadow (depth)
    // subtly cool zone, stronger toward lower-right where steam billows
    "  float zone = smoothstep(0.0,1.0,(1.0-uv.y)) * (0.30+0.70*smoothstep(-0.1,0.7,uv.x));",
    "  vec3 base = mix(white, coolbg, zone*0.85);",
    "  float dd = clamp(density,0.0,1.0);",
    "  vec3 col = mix(base, shadow, dd*0.30);",                  // darker base of plume
    "  col = mix(col, steam, smoothstep(0.22,0.92,dd));",        // bright rising wisps
    // subtle dither to avoid banding (polish)
    "  col += (hash(gl_FragCoord.xy + u_time)-0.5)/220.0;",

    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, "u_res");
  var uTime = gl.getUniformLocation(prog, "u_time");
  var uMouse = gl.getUniformLocation(prog, "u_mouse");
  var uIntro = gl.getUniformLocation(prog, "u_intro");

  var SCALE = 0.66;
  var W = 0, H = 0;
  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(2, Math.round(rect.width * SCALE));
    H = Math.max(2, Math.round(rect.height * SCALE));
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
  }
  window.addEventListener("resize", resize);
  resize();

  var mouse = { x: 0.72, y: 0.4, tx: 0.72, ty: 0.4 };
  window.addEventListener("pointermove", function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.tx = (e.clientX - rect.left) / rect.width;
    mouse.ty = 1.0 - (e.clientY - rect.top) / rect.height;
  });

  var start = null, intro = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (start === null) start = now;
    var time = (now - start) / 1000;
    if (intro < 1) intro = Math.min(1, intro + 0.01);
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uTime, reduceMotion ? 8.0 : time);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uIntro, reduceMotion ? 1.0 : intro);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
})();
