type ElementType = "leg" | "hypotenuse" | "adjacent angle" | "opposite angle" | "angle";

type TriangleResult =
  | { ok: true; a: number; b: number; c: number; alpha: number; beta: number }
  | { ok: false; message: string; failedType?: boolean };

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function isFiniteNumber(x: number): boolean {
  return Number.isFinite(x) && !Number.isNaN(x);
}

function fmt(x: number): string {
  const s = x.toFixed(10);
  return s.replace(/\.?0+$/, "");
}

function printUsage(): void {
  console.log("=== Lab 1: triangle(v1, type1, v2, type2) ===");
  console.log("Types:");
  console.log('  "leg"            - катет');
  console.log('  "hypotenuse"     - гіпотенуза');
  console.log('  "adjacent angle" - прилеглий до катета кут (градуси)');
  console.log('  "opposite angle" - протилежний до катета кут (градуси)');
  console.log('  "angle"          - один з гострих кутів, коли задана гіпотенуза (градуси)');
  console.log("Examples:");
  console.log('  triangle(4, "leg", 8, "hypotenuse")');
  console.log('  triangle(8, "hypotenuse", 4, "leg")');
  console.log('  triangle(60, "opposite angle", 5, "leg")');
}

function normalizeType(t: string): string {
  return t.trim().toLowerCase();
}

function parseType(t: string): ElementType | null {
  const nt = normalizeType(t);
  if (
    nt === "leg" ||
    nt === "hypotenuse" ||
    nt === "adjacent angle" ||
    nt === "opposite angle" ||
    nt === "angle"
  ) {
    return nt as ElementType;
  }
  return null;
}

function validatePositive(name: string, v: number): TriangleResult | null {
  if (!isFiniteNumber(v)) return { ok: false, message: `Invalid number for ${name}` };
  if (v <= 0) return { ok: false, message: "Zero or negative input" };
  return null;
}

function validateAcuteAngleDeg(angleDeg: number): TriangleResult | null {
  if (!isFiniteNumber(angleDeg)) return { ok: false, message: "Invalid angle number" };
  if (angleDeg <= 0 || angleDeg >= 90) return { ok: false, message: "Angle must be acute (0 < angle < 90)" };
  return null;
}

function solveTriangle(v1: number, t1: ElementType, v2: number, t2: ElementType): TriangleResult {
  const vp1 = validatePositive("value1", v1);
  if (vp1) return vp1;
  const vp2 = validatePositive("value2", v2);
  if (vp2) return vp2;

  let AVal = v1, AType = t1;
  let BVal = v2, BType = t2;

  if (AType === "leg" && BType === "leg") {
    const a = AVal; 
    const b = BVal; 
    const c = Math.sqrt(a * a + b * b);

    const alpha = radToDeg(Math.atan2(a, b)); 
    const beta = 90 - alpha;

    return { ok: true, a, b, c, alpha, beta };
  }

  if (
    (AType === "leg" && BType === "hypotenuse") ||
    (AType === "hypotenuse" && BType === "leg")
  ) {
    const a = (AType === "leg") ? AVal : BVal;
    const c = (AType === "hypotenuse") ? AVal : BVal;

    if (a >= c) return { ok: false, message: "Leg must be smaller than hypotenuse" };

    const b = Math.sqrt(c * c - a * a);
    const alpha = radToDeg(Math.asin(a / c));
    const beta = 90 - alpha;

    return { ok: true, a, b, c, alpha, beta };
  }

  if (
    (AType === "hypotenuse" && BType === "angle") ||
    (AType === "angle" && BType === "hypotenuse")
  ) {
    const c = (AType === "hypotenuse") ? AVal : BVal;
    const angleDeg = (AType === "angle") ? AVal : BVal;

    const va = validateAcuteAngleDeg(angleDeg);
    if (va) return va;

    const alpha = angleDeg; 
    const beta = 90 - alpha;

    const alphaRad = degToRad(alpha);
    const a = c * Math.sin(alphaRad);
    const b = c * Math.cos(alphaRad);

    return { ok: true, a, b, c, alpha, beta };
  }

  if (
    (AType === "leg" && BType === "opposite angle") ||
    (AType === "opposite angle" && BType === "leg")
  ) {
    const a = (AType === "leg") ? AVal : BVal;
    const alpha = (AType === "opposite angle") ? AVal : BVal;

    const va = validateAcuteAngleDeg(alpha);
    if (va) return va;

    const alphaRad = degToRad(alpha);
    const b = a / Math.tan(alphaRad);
    const c = a / Math.sin(alphaRad);
    const beta = 90 - alpha;

    return { ok: true, a, b, c, alpha, beta };
  }
  
  if (
    (AType === "leg" && BType === "adjacent angle") ||
    (AType === "adjacent angle" && BType === "leg")
  ) {
    const a = (AType === "leg") ? AVal : BVal;
    const beta = (AType === "adjacent angle") ? AVal : BVal;

    const vb = validateAcuteAngleDeg(beta);
    if (vb) return vb;

    const betaRad = degToRad(beta);
    const b = a * Math.tan(betaRad);
    const c = a / Math.cos(betaRad);
    const alpha = 90 - beta;

    return { ok: true, a, b, c, alpha, beta };
  }

  return {
    ok: false,
    failedType: true,
    message: 'Incompatible types. Re-read the instruction and allowed "types".',
  };
}

function outputResult(r: TriangleResult): string {
  if (!r.ok) {

    if (r.failedType) {
      console.log(r.message);
      console.log("Please re-read the usage instruction (see above).");
      return "failed";
    }

    console.log(r.message);
    return r.message;
  }

  console.log(`a = ${fmt(r.a)}`);
  console.log(`b = ${fmt(r.b)}`);
  console.log(`c = ${fmt(r.c)}`);
  console.log(`alpha = ${fmt(r.alpha)}`);
  console.log(`beta = ${fmt(r.beta)}`);
  return "success";
}

function triangle(v1: number, type1: string, v2: number, type2: string): string {
  const t1 = parseType(type1);
  const t2 = parseType(type2);

  if (!t1 || !t2) {
    console.log('Unknown type. Allowed: "leg", "hypotenuse", "adjacent angle", "opposite angle", "angle"');
    console.log("Please re-read the usage instruction (see above).");
    return "failed";
  }

  const r = solveTriangle(v1, t1, v2, t2);
  return outputResult(r);
}

printUsage();

(window as any).triangle = triangle;
