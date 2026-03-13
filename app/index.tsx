import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";

type Operation = "+" | "-" | "×" | "÷" | null;

const C = Colors.dark;

function triggerHaptic(type: "light" | "medium" | "heavy" = "light") {
  if (Platform.OS !== "web") {
    if (type === "heavy") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (type === "medium") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
}

function formatNumber(num: number): string {
  if (!isFinite(num)) return "خطأ";
  if (Number.isInteger(num)) {
    if (Math.abs(num) >= 1e15) return num.toExponential(4);
    return num.toLocaleString("en-US");
  }
  const str = parseFloat(num.toPrecision(10)).toString();
  const [intPart, decPart] = str.split(".");
  const formattedInt = parseInt(intPart).toLocaleString("en-US");
  return `${formattedInt}.${decPart ?? ""}`;
}

function formatDisplay(value: string): string {
  if (value === "خطأ") return value;
  if (value.endsWith(".")) {
    const int = parseInt(value.slice(0, -1));
    return isNaN(int) ? "0." : int.toLocaleString("en-US") + ".";
  }
  if (value.includes(".")) {
    const [intPart, decPart] = value.split(".");
    const formattedInt = parseInt(intPart).toLocaleString("en-US");
    return `${formattedInt}.${decPart}`;
  }
  const num = parseFloat(value);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US");
}

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();

  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  const [resetNext, setResetNext] = useState(false);

  const calculate = useCallback(
    (a: number, b: number, op: Operation): number => {
      switch (op) {
        case "+": return a + b;
        case "-": return a - b;
        case "×": return a * b;
        case "÷": return b === 0 ? NaN : a / b;
        default: return b;
      }
    },
    [],
  );

  const handleNumber = useCallback(
    (num: string) => {
      triggerHaptic("light");
      if (display === "خطأ") {
        setDisplay(num);
        return;
      }
      if (resetNext) {
        setDisplay(num);
        setResetNext(false);
      } else {
        setDisplay((prev) => (prev === "0" ? num : prev.length >= 12 ? prev : prev + num));
      }
    },
    [display, resetNext],
  );

  const handleDecimal = useCallback(() => {
    triggerHaptic("light");
    if (display === "خطأ") {
      setDisplay("0.");
      return;
    }
    if (resetNext) {
      setDisplay("0.");
      setResetNext(false);
    } else if (!display.includes(".")) {
      setDisplay((prev) => prev + ".");
    }
  }, [display, resetNext]);

  const handleOperation = useCallback(
    (op: Operation) => {
      triggerHaptic("medium");
      if (display === "خطأ") return;
      const current = parseFloat(display.replace(/,/g, ""));
      if (previousValue !== null && operation && !resetNext) {
        const result = calculate(previousValue, current, operation);
        if (!isFinite(result)) {
          setDisplay("خطأ");
          setPreviousValue(null);
          setOperation(null);
          setResetNext(true);
          return;
        }
        const formatted = formatNumber(result);
        setDisplay(formatted);
        setPreviousValue(result);
      } else {
        setPreviousValue(current);
      }
      setOperation(op);
      setResetNext(true);
    },
    [display, previousValue, operation, resetNext, calculate],
  );

  const handleEquals = useCallback(() => {
    triggerHaptic("heavy");
    if (previousValue === null || !operation || display === "خطأ") return;
    const current = parseFloat(display.replace(/,/g, ""));
    const result = calculate(previousValue, current, operation);
    if (!isFinite(result)) {
      setDisplay("خطأ");
    } else {
      setDisplay(formatNumber(result));
    }
    setPreviousValue(null);
    setOperation(null);
    setResetNext(true);
  }, [display, previousValue, operation, calculate]);

  const handleClear = useCallback(() => {
    triggerHaptic("medium");
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setResetNext(false);
  }, []);

  const handleToggleSign = useCallback(() => {
    triggerHaptic("light");
    if (display === "0" || display === "خطأ") return;
    setDisplay((prev) =>
      prev.startsWith("-") ? prev.slice(1) : "-" + prev
    );
  }, [display]);

  const handlePercent = useCallback(() => {
    triggerHaptic("light");
    if (display === "خطأ") return;
    const current = parseFloat(display.replace(/,/g, ""));
    setDisplay(formatNumber(current / 100));
    setResetNext(true);
  }, [display]);

  const handleBackspace = useCallback(() => {
    triggerHaptic("light");
    if (display === "خطأ" || resetNext) {
      setDisplay("0");
      return;
    }
    setDisplay((prev) => {
      const stripped = prev.replace(/,/g, "");
      if (stripped.length <= 1 || (stripped.length === 2 && stripped.startsWith("-"))) return "0";
      return stripped.slice(0, -1);
    });
  }, [display, resetNext]);

  const displayedValue = display === "خطأ" ? display : formatDisplay(display.replace(/,/g, ""));
  const displayFontSize =
    displayedValue.length > 14 ? 36 :
    displayedValue.length > 10 ? 48 :
    displayedValue.length > 7 ? 58 : 68;

  const expressionText =
    previousValue !== null && operation
      ? `${formatNumber(previousValue)} ${operation}`
      : "";

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <View style={styles.displayArea}>
        <Text style={styles.expression} numberOfLines={1}>
          {expressionText}
        </Text>
        <Text
          style={[styles.displayText, { fontSize: displayFontSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {displayedValue}
        </Text>
      </View>

      <View style={styles.buttonsArea}>
        <View style={styles.row}>
          <CalcButton label="C" onPress={handleClear} variant="func" />
          <CalcButton label="±" onPress={handleToggleSign} variant="func" />
          <CalcButton label="%" onPress={handlePercent} variant="func" />
          <CalcButton
            label="÷"
            onPress={() => handleOperation("÷")}
            variant="operator"
            active={operation === "÷" && resetNext}
          />
        </View>
        <View style={styles.row}>
          <CalcButton label="7" onPress={() => handleNumber("7")} />
          <CalcButton label="8" onPress={() => handleNumber("8")} />
          <CalcButton label="9" onPress={() => handleNumber("9")} />
          <CalcButton
            label="×"
            onPress={() => handleOperation("×")}
            variant="operator"
            active={operation === "×" && resetNext}
          />
        </View>
        <View style={styles.row}>
          <CalcButton label="4" onPress={() => handleNumber("4")} />
          <CalcButton label="5" onPress={() => handleNumber("5")} />
          <CalcButton label="6" onPress={() => handleNumber("6")} />
          <CalcButton
            label="-"
            onPress={() => handleOperation("-")}
            variant="operator"
            active={operation === "-" && resetNext}
          />
        </View>
        <View style={styles.row}>
          <CalcButton label="1" onPress={() => handleNumber("1")} />
          <CalcButton label="2" onPress={() => handleNumber("2")} />
          <CalcButton label="3" onPress={() => handleNumber("3")} />
          <CalcButton
            label="+"
            onPress={() => handleOperation("+")}
            variant="operator"
            active={operation === "+" && resetNext}
          />
        </View>
        <View style={styles.row}>
          <CalcButton label="⌫" onPress={handleBackspace} variant="num" textStyle={{ fontSize: 22 }} />
          <CalcButton label="0" onPress={() => handleNumber("0")} />
          <CalcButton label="." onPress={handleDecimal} />
          <CalcButton label="=" onPress={handleEquals} variant="equals" />
        </View>
      </View>
    </View>
  );
}

type BtnVariant = "num" | "func" | "operator" | "equals";

function CalcButton({
  label,
  onPress,
  variant = "num",
  active = false,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  active?: boolean;
  textStyle?: object;
}) {
  const bgMap: Record<BtnVariant, string> = {
    num: C.numberBtn,
    func: C.funcBtn,
    operator: active ? C.operatorBtnActive : C.operatorBtn,
    equals: C.equalsBtn,
  };

  const textMap: Record<BtnVariant, string> = {
    num: C.numberBtnText,
    func: C.funcBtnText,
    operator: active ? C.operatorBtnActiveText : C.operatorBtnText,
    equals: C.equalsBtnText,
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bgMap[variant], opacity: pressed ? 0.75 : 1 },
      ]}
      testID={`btn-${label}`}
    >
      <Text style={[styles.buttonText, { color: textMap[variant] }, textStyle]}>
        {label}
      </Text>
    </Pressable>
  );
}

const BTN_SIZE = 78;
const GAP = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: "flex-end",
  },
  displayArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: "flex-end",
    minHeight: 140,
    justifyContent: "flex-end",
  },
  expression: {
    fontSize: 22,
    color: C.expressionText,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
    height: 28,
  },
  displayText: {
    color: C.displayText,
    fontFamily: "Inter_400Regular",
    letterSpacing: -2,
    textAlign: "right",
  },
  buttonsArea: {
    paddingHorizontal: 16,
    gap: GAP,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
    justifyContent: "space-between",
  },
  button: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 28,
    fontFamily: "Inter_400Regular",
  },
});
