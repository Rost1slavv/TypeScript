console.log(`
--- Інструкція з використання функції triangle() ---
Виклик: triangle(значення1, "тип1", значення2, "тип2")
Доступні типи:
- "leg" (катет)
- "hypotenuse" (гіпотенуза)
- "adjacent angle" (прилеглий до катета кут)
- "opposite angle" (протилежний до катета кут)
- "angle" (один з двох гострих кутів, коли задана гіпотенуза)
Приклад: triangle(7, "leg", 18, "hypotenuse");
----------------------------------------------------
`);

type ElementType = "leg" | "hypotenuse" | "adjacent angle" | "opposite angle" | "angle";

function triangle(val1: number, type1: ElementType, val2: number, type2: ElementType): string {
  
    if (val1 <= 0 || val2 <= 0) {
        console.log("Zero or negative input");
        return "Zero or negative input";
    }

    let legs: number[] = [];
    let hyp: number = 0;
    let adjAngle: number = 0;
    let oppAngle: number = 0;
    let angle: number = 0;

    const processArg = (v: number, t: string) => {
        switch(t) {
            case "leg": legs.push(v); break;
            case "hypotenuse": hyp = v; break;
            case "adjacent angle": adjAngle = v; break;
            case "opposite angle": oppAngle = v; break;
            case "angle": angle = v; break;
            default: return false;
        }
        return true;
    };

    if (!processArg(val1, type1) || !processArg(val2, type2)) {
        console.log("Невірний тип аргументу. Будь ласка, перечитайте інструкцію.");
        return "failed";
    }

    let a = 0, b = 0, c = 0, alpha = 0, beta = 0;
    
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;

    if (legs.length === 2) {
      
        a = legs[0]; 
        b = legs[1];
        c = Math.sqrt(a * a + b * b);
        alpha = toDeg(Math.atan(a / b));
        beta = 90 - alpha;
    } else if (legs.length === 1 && hyp > 0) {

        a = legs[0]; 
        c = hyp;
        if (a >= c) {
            console.log("Помилка: катет не може бути більшим або рівним гіпотенузі");
            return "Invalid input";
        }
        b = Math.sqrt(c * c - a * a);
        alpha = toDeg(Math.asin(a / c));
        beta = 90 - alpha;
    } else if (legs.length === 1 && adjAngle > 0) {

        a = legs[0]; 
        beta = adjAngle;
        if (beta >= 90) return "Invalid input";
        alpha = 90 - beta;
        b = a * Math.tan(toRad(beta));
        c = a / Math.cos(toRad(beta));
    } else if (legs.length === 1 && oppAngle > 0) {

        a = legs[0]; 
        alpha = oppAngle;
        if (alpha >= 90) return "Invalid input";
        beta = 90 - alpha;
        b = a / Math.tan(toRad(alpha));
        c = a / Math.sin(toRad(alpha));
    } else if (hyp > 0 && angle > 0) {

        c = hyp; 
        alpha = angle;
        if (alpha >= 90) return "Invalid input";
        beta = 90 - alpha;
        a = c * Math.sin(toRad(alpha));
        b = c * Math.cos(toRad(alpha));
    } else {

        console.log("Несумісна пара типів. Будь ласка, перечитайте інструкцію.");
        return "failed";
    }

    console.log(`a = ${a}`);
    console.log(`b = ${b}`);
    console.log(`c = ${c}`);
    console.log(`alpha = ${alpha}`);
    console.log(`beta = ${beta}`);

    return "success";
}
