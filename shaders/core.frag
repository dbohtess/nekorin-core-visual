#version 330 core

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_pulse;

#define PI 3.14159265359

mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float sdEllipse(vec2 p, vec2 ab) {
    p = abs(p);
    if (p.x > p.y) { p = p.yx; ab = ab.yx; }
    float l = ab.y * ab.y - ab.x * ab.x;
    float m = ab.x * p.x / l;
    float n = ab.y * p.y / l;
    float m2 = m * m;
    float n2 = n * n;
    float c = (m2 + n2 - 1.0) / 3.0;
    float c3 = c * c * c;
    float q = c3 + m2 * n2 * 2.0;
    float d = c3 + m2 * n2;
    float g = m + m * n2;
    float co;
    if (d < 0.0) {
        float h = acos(q / c3) / 3.0;
        float s = cos(h);
        float t = sin(h) * sqrt(3.0);
        float rx = sqrt(-c * (s + t + 2.0) + m2);
        float ry = sqrt(-c * (s - t + 2.0) + m2);
        co = (ry + sign(l) * rx + abs(g) / (rx * ry) - m) / 2.0;
    } else {
        float h = 2.0 * m * n * sqrt(d);
        float s = sign(q + h) * pow(abs(q + h), 1.0 / 3.0);
        float u = sign(q - h) * pow(abs(q - h), 1.0 / 3.0);
        float rx = -s - u - c * 4.0 + 2.0 * m2;
        float ry = (s - u) * sqrt(3.0);
        float rm = sqrt(rx * rx + ry * ry);
        co = (ry / sqrt(rm - rx) + 2.0 * g / rm - m) / 2.0;
    }
    float si = sqrt(1.0 - co * co);
    vec2 r = ab * vec2(co, si);
    return length(r - p) * sign(p.y - r.y);
}

float lineGlow(float d, float width, float glow) {
    float core = smoothstep(width, 0.0, abs(d));
    float halo = exp(-abs(d) * glow);
    return core + halo * 0.35;
}

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float starField(vec2 p) {
    vec2 g = floor(p * 90.0);
    vec2 f = fract(p * 90.0) - 0.5;
    float h = hash21(g);
    float s = smoothstep(0.035, 0.0, length(f));
    return s * step(0.94, h) * mix(0.25, 1.0, h);
}

float ring(vec2 p, float r, float w) {
    return lineGlow(length(p) - r, w, 95.0);
}

float ellipseGlow(vec2 p, vec2 ab, float angle, vec2 offset, float width) {
    vec2 q = rot(angle) * (p - offset);
    return lineGlow(sdEllipse(q, ab), width, 72.0);
}

vec3 paletteRed() { return vec3(1.0, 0.06, 0.13); }
vec3 paletteGold() { return vec3(1.0, 0.58, 0.10); }
vec3 paletteWarm() { return vec3(1.0, 0.90, 0.72); }

void main() {
    vec2 uv = v_uv;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;

    float t = u_time;
    vec3 col = vec3(0.0015, 0.004, 0.010);

    float stars = starField(uv + vec2(t * 0.0008, 0.0));
    col += vec3(0.45, 0.68, 1.0) * stars * 0.45;

    // Outer elegant memory trajectories: many thin, offset, low-energy ellipses.
    for (int i = 0; i < 11; i++) {
        float fi = float(i);
        float a = -1.35 + fi * 0.28 + sin(fi * 1.71) * 0.22;
        vec2 ab = vec2(0.54 + 0.035 * sin(fi * 2.1), 0.19 + 0.025 * cos(fi * 1.37));
        vec2 off = vec2(0.028 * sin(fi * 2.73), 0.018 * cos(fi * 1.91));
        float e = ellipseGlow(p, ab, a + t * (0.008 + fi * 0.0009), off, 0.00135);
        vec3 ec = mix(paletteRed(), paletteGold(), mod(fi, 2.0));
        col += ec * e * 0.22;
    }

    // Sparse bright traveling memory nodes on the outer paths.
    for (int i = 0; i < 18; i++) {
        float fi = float(i);
        float a = fi * 2.399 + t * (0.10 + mod(fi, 5.0) * 0.006);
        float ex = 0.49 * cos(a);
        float ey = 0.24 * sin(a);
        vec2 q = rot(fi * 0.41 - 0.9) * vec2(ex, ey);
        q += vec2(0.025 * sin(fi), 0.015 * cos(fi * 1.7));
        float d = length(p - q);
        float node = exp(-d * 115.0);
        vec3 nc = (mod(fi, 3.0) < 1.0) ? paletteWarm() : ((mod(fi, 3.0) < 2.0) ? paletteRed() : paletteGold());
        col += nc * node * 1.35;
    }

    // Central technical rings: thin and subordinate, not the focal point.
    float pulse = 1.0 + 0.02 * sin(t * 1.7) + u_pulse * 0.06;
    for (int i = 0; i < 9; i++) {
        float fi = float(i);
        float rr = (0.078 + fi * 0.016) * pulse;
        float rg = ring(p, rr, 0.0009);
        vec3 rc = mix(paletteGold(), paletteRed(), mod(fi, 2.0));
        col += rc * rg * (0.08 + fi * 0.004);
    }

    // Dense living lattice around the nucleus using intersecting warped filaments.
    float lattice = 0.0;
    vec3 latticeCol = vec3(0.0);
    for (int i = 0; i < 22; i++) {
        float fi = float(i);
        float ang = fi * (PI / 11.0) + 0.16 * sin(t * 0.12 + fi * 1.3);
        vec2 q = rot(ang) * p;
        float curve = q.y - (0.022 * sin(q.x * (36.0 + fi * 1.7) + fi * 2.1 + t * 0.35));
        float mask = smoothstep(0.20, 0.045, length(p));
        float g = lineGlow(curve, 0.00075, 135.0) * mask;
        lattice += g;
        latticeCol += mix(paletteWarm(), paletteGold(), 0.35 + 0.35 * sin(fi)) * g;
    }

    // Additional angular neural threads to break symmetry.
    for (int i = 0; i < 13; i++) {
        float fi = float(i);
        float ang = fi * 0.71 + t * (0.012 + fi * 0.0007);
        vec2 q = rot(ang) * p;
        float bend = q.y - 0.11 * q.x * q.x * sin(fi * 1.2 + 0.8);
        float mask = smoothstep(0.19, 0.035, length(p));
        float g = lineGlow(bend, 0.0006, 125.0) * mask;
        latticeCol += mix(paletteRed(), paletteWarm(), 0.64) * g * 0.30;
    }

    col += latticeCol * 0.32;

    // Hot neural vertices distributed through the inner field.
    for (int i = 0; i < 26; i++) {
        float fi = float(i);
        float a = fi * 2.399963 + 0.08 * sin(t * 0.17 + fi);
        float r = 0.035 + 0.145 * fract(fi * 0.6180339);
        vec2 q = vec2(cos(a), sin(a) * 0.88) * r;
        float d = length(p - q);
        float n = exp(-d * 150.0);
        vec3 nc = (mod(fi, 4.0) < 1.0) ? paletteRed() : ((mod(fi, 4.0) < 2.0) ? paletteGold() : paletteWarm());
        col += nc * n * 0.75;
    }

    // Bright white-gold nucleus and true soft additive bloom.
    float d0 = length(p);
    float nucleus = exp(-d0 * 145.0);
    float bloom1 = exp(-d0 * 34.0);
    float bloom2 = exp(-d0 * 12.0);
    col += vec3(1.0, 0.95, 0.82) * nucleus * 3.8;
    col += vec3(1.0, 0.54, 0.12) * bloom1 * 0.75;
    col += vec3(1.0, 0.07, 0.12) * bloom2 * 0.10;

    // Fine star-like rays from the heart.
    float rayH = exp(-abs(p.y) * 240.0) * exp(-abs(p.x) * 15.0);
    float rayV = exp(-abs(p.x) * 240.0) * exp(-abs(p.y) * 15.0);
    col += vec3(1.0, 0.94, 0.84) * (rayH + rayV) * 0.42;

    // Tone mapping for cinematic additive light.
    col = vec3(1.0) - exp(-col * 1.35);
    col = pow(col, vec3(0.90));

    fragColor = vec4(col, 1.0);
}
