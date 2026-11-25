import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  value: string | null;
  title?: string;
  minDate?: string | null;
  allowClear?: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  onClear?: () => void;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseISO(iso: string | null): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]) - 1,
    d: Number(match[3]),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function DatePickerModal({
  visible,
  value,
  title = "Select date",
  minDate = null,
  allowClear = false,
  onClose,
  onSelect,
  onClear,
}: Props) {
  const today = new Date();
  const parsed = parseISO(value);
  const [viewYear, setViewYear] = useState(parsed?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? today.getMonth());
  const [selected, setSelected] = useState<string | null>(value);
  const [mode, setMode] = useState<"days" | "years">("days");
  const [yearPageStart, setYearPageStart] = useState<number>(
    Math.floor((parsed?.y ?? today.getFullYear()) / 12) * 12,
  );

  useEffect(() => {
    if (!visible) return;
    const p = parseISO(value);
    const y = p?.y ?? today.getFullYear();
    if (p) {
      setViewYear(p.y);
      setViewMonth(p.m);
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
    setSelected(value);
    setMode("days");
    setYearPageStart(Math.floor(y / 12) * 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, value]);

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const total = daysInMonth(viewYear, viewMonth);
    const out: Array<{ day: number; iso: string } | null> = [];
    for (let i = 0; i < firstDay; i++) out.push(null);
    for (let d = 1; d <= total; d++) {
      out.push({ day: d, iso: toISO(viewYear, viewMonth, d) });
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleConfirm() {
    if (selected) onSelect(selected);
    onClose();
  }

  function handleClear() {
    if (onClear) onClear();
    onClose();
  }

  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-md rounded-2xl bg-white p-4 shadow">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-900">{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            >
              <Ionicons name="close" size={20} color="#475569" />
            </Pressable>
          </View>

          <View className="mt-2 flex-row items-center justify-between">
            <Pressable
              onPress={() =>
                mode === "days" ? prevMonth() : setYearPageStart((s) => s - 12)
              }
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            >
              <Ionicons name="chevron-back" size={20} color="#1858b8" />
            </Pressable>
            <Pressable
              onPress={() => {
                if (mode === "days") {
                  setYearPageStart(Math.floor(viewYear / 12) * 12);
                  setMode("years");
                } else {
                  setMode("days");
                }
              }}
              hitSlop={8}
              className="flex-row items-center gap-1 rounded-lg px-2 py-1 active:bg-slate-100"
            >
              <Text className="text-sm font-semibold text-slate-800">
                {mode === "days"
                  ? `${MONTHS[viewMonth]} ${viewYear}`
                  : `${yearPageStart} – ${yearPageStart + 11}`}
              </Text>
              <Ionicons
                name={mode === "days" ? "chevron-down" : "chevron-up"}
                size={14}
                color="#64748b"
              />
            </Pressable>
            <Pressable
              onPress={() =>
                mode === "days" ? nextMonth() : setYearPageStart((s) => s + 12)
              }
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            >
              <Ionicons name="chevron-forward" size={20} color="#1858b8" />
            </Pressable>
          </View>

          {mode === "years" ? (
            <View className="mt-2">
              {Array.from({ length: 4 }, (_, rowIdx) => (
                <View key={rowIdx} className="flex-row">
                  {Array.from({ length: 3 }, (_, colIdx) => {
                    const y = yearPageStart + rowIdx * 3 + colIdx;
                    const isCurrent = y === viewYear;
                    const isThisYear = y === today.getFullYear();
                    return (
                      <View key={y} className="flex-1 p-1">
                        <Pressable
                          onPress={() => {
                            setViewYear(y);
                            setMode("days");
                          }}
                          className={`items-center justify-center rounded-xl py-3 ${
                            isCurrent
                              ? "bg-brand-600"
                              : isThisYear
                                ? "border border-brand-300 bg-brand-50"
                                : "active:bg-slate-100"
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              isCurrent
                                ? "font-semibold text-white"
                                : isThisYear
                                  ? "font-semibold text-brand-700"
                                  : "text-slate-800"
                            }`}
                          >
                            {y}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : (
            <>
              <View className="mt-2 flex-row">
                {WEEKDAYS.map((w) => (
                  <View key={w} className="flex-1 items-center py-1">
                    <Text className="text-[11px] font-semibold uppercase text-slate-400">
                      {w}
                    </Text>
                  </View>
                ))}
              </View>

              <View>
                {Array.from({ length: Math.ceil(cells.length / 7) }, (_, rowIdx) => (
                  <View key={rowIdx} className="flex-row">
                    {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((cell, colIdx) => {
                      if (!cell) {
                        return (
                          <View
                            key={`e-${rowIdx}-${colIdx}`}
                            className="aspect-square flex-1 p-1"
                          />
                        );
                      }
                      const isSelected = selected === cell.iso;
                      const isToday = todayISO === cell.iso;
                      const disabled = minDate !== null && cell.iso < minDate;
                      return (
                        <View key={cell.iso} className="aspect-square flex-1 p-1">
                          <Pressable
                            onPress={() => !disabled && setSelected(cell.iso)}
                            disabled={disabled}
                            className={`flex-1 items-center justify-center rounded-full ${
                              isSelected
                                ? "bg-brand-600"
                                : isToday
                                  ? "border border-brand-300 bg-brand-50"
                                  : "active:bg-slate-100"
                            } ${disabled ? "opacity-30" : ""}`}
                          >
                            <Text
                              className={`text-sm ${
                                isSelected
                                  ? "font-semibold text-white"
                                  : isToday
                                    ? "font-semibold text-brand-700"
                                    : "text-slate-800"
                              }`}
                            >
                              {cell.day}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </>
          )}

          <View className="mt-4 flex-row gap-3">
            {allowClear ? (
              <Pressable
                onPress={handleClear}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-sm font-semibold text-slate-700">
                  Clear
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={onClose}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-sm font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleConfirm}
              disabled={!selected}
              className={`flex-1 rounded-xl px-4 py-3 ${
                !selected ? "bg-brand-500/50" : "bg-brand-600 active:bg-brand-700"
              }`}
            >
              <Text className="text-center text-sm font-semibold text-white">
                Select
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
