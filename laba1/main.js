console.log("\n--- \u0406\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0456\u044F \u0437 \u0432\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u043D\u043D\u044F \u0444\u0443\u043D\u043A\u0446\u0456\u0457 triangle() ---\n\u0412\u0438\u043A\u043B\u0438\u043A: triangle(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F1, \"\u0442\u0438\u043F1\", \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F2, \"\u0442\u0438\u043F2\")\n\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0456 \u0442\u0438\u043F\u0438:\n- \"leg\" (\u043A\u0430\u0442\u0435\u0442)\n- \"hypotenuse\" (\u0433\u0456\u043F\u043E\u0442\u0435\u043D\u0443\u0437\u0430)\n- \"adjacent angle\" (\u043F\u0440\u0438\u043B\u0435\u0433\u043B\u0438\u0439 \u0434\u043E \u043A\u0430\u0442\u0435\u0442\u0430 \u043A\u0443\u0442)\n- \"opposite angle\" (\u043F\u0440\u043E\u0442\u0438\u043B\u0435\u0436\u043D\u0438\u0439 \u0434\u043E \u043A\u0430\u0442\u0435\u0442\u0430 \u043A\u0443\u0442)\n- \"angle\" (\u043E\u0434\u0438\u043D \u0437 \u0434\u0432\u043E\u0445 \u0433\u043E\u0441\u0442\u0440\u0438\u0445 \u043A\u0443\u0442\u0456\u0432, \u043A\u043E\u043B\u0438 \u0437\u0430\u0434\u0430\u043D\u0430 \u0433\u0456\u043F\u043E\u0442\u0435\u043D\u0443\u0437\u0430)\n\u041F\u0440\u0438\u043A\u043B\u0430\u0434: triangle(7, \"leg\", 18, \"hypotenuse\");\n----------------------------------------------------\n");
function triangle(val1, type1, val2, type2) {
  
    if (val1 <= 0 || val2 <= 0) {
        console.log("Zero or negative input");
        return "Zero or negative input";
    }

    var legs = [];
    var hyp = 0;
    var adjAngle = 0;
    var oppAngle = 0;
    var angle = 0;

    var processArg = function (v, t) {
        switch (t) {
            case "leg":
                legs.push(v);
                break;
            case "hypotenuse":
                hyp = v;
                break;
            case "adjacent angle":
                adjAngle = v;
                break;
            case "opposite angle":
                oppAngle = v;
                break;
            case "angle":
                angle = v;
                break;
            default: return false;
        }
        return true;
    };
    if (!processArg(val1, type1) || !processArg(val2, type2)) {
        console.log("Невірний тип аргументу. Будь ласка, перечитайте інструкцію.");
        return "failed";
    }

    var a = 0, b = 0, c = 0, alpha = 0, beta = 0;

    var toRad = function (deg) { return deg * Math.PI / 180; };
    var toDeg = function (rad) { return rad * 180 / Math.PI; };

    if (legs.length === 2) {

        a = legs[0];
        b = legs[1];
        c = Math.sqrt(a * a + b * b);
        alpha = toDeg(Math.atan(a / b));
        beta = 90 - alpha;
    }
    else if (legs.length === 1 && hyp > 0) {

        a = legs[0];
        c = hyp;
        if (a >= c) {
            console.log("Помилка: катет не може бути більшим або рівним гіпотенузі");
            return "Invalid input";
        }
        b = Math.sqrt(c * c - a * a);
        alpha = toDeg(Math.asin(a / c));
        beta = 90 - alpha;
    }
    else if (legs.length === 1 && adjAngle > 0) {

        a = legs[0];
        beta = adjAngle;
        if (beta >= 90)
            return "Invalid input";
        alpha = 90 - beta;
        b = a * Math.tan(toRad(beta));
        c = a / Math.cos(toRad(beta));
    }
    else if (legs.length === 1 && oppAngle > 0) {

        a = legs[0];
        alpha = oppAngle;
        if (alpha >= 90)
            return "Invalid input";
        beta = 90 - alpha;
        b = a / Math.tan(toRad(alpha));
        c = a / Math.sin(toRad(alpha));
    }
    else if (hyp > 0 && angle > 0) {

        c = hyp;
        alpha = angle;
        if (alpha >= 90)
            return "Invalid input";
        beta = 90 - alpha;
        a = c * Math.sin(toRad(alpha));
        b = c * Math.cos(toRad(alpha));
    }
    else {
        
        console.log("Несумісна пара типів. Будь ласка, перечитайте інструкцію.");
        return "failed";
    }

    console.log("a = ".concat(a));
    console.log("b = ".concat(b));
    console.log("c = ".concat(c));
    console.log("alpha = ".concat(alpha));
    console.log("beta = ".concat(beta));
    return "success";
}
