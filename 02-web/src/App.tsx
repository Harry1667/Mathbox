import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Moon, Sun, Plus, Settings, Send, Search, Clock, ArrowRight, Repeat2,
  Menu, Calculator, Library, Zap, Cpu, Infinity, ChevronDown,
  Check, X, Edit, Trash2, Tag, BookOpen, AlertCircle,
  LayoutTemplate, Code, Loader2, Copy, Sparkles, RotateCcw
} from 'lucide-react';
import { BlockMath, InlineMath } from 'react-katex';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { evaluate } from 'mathjs';

import { UNITS_DB } from './database/units';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// ===============
// TYPES & DATA
// ===============

export type FormulaVariable = {
  symbol: string;
  name: string;
  type: string;
  defaultUnit: string;
};

export type Formula = {
  id: string;
  name: string;
  category: string;
  latex: string;
  mathjs: string;
  variables: FormulaVariable[];
  result: FormulaVariable;
  mode?: 'algebraic' | 'calculus' | 'matrix' | 'evaluate';
  note?: string;
};

const CATEGORIES = [
  { id: 'all', name: '全部公式 / All', icon: Library },
  { id: '電路學', name: '電路學 / Circuits', icon: Cpu },
  { id: '物理', name: '物理 / Physics', icon: Zap },
  { id: '力學', name: '力學 / Mechanics', icon: BookOpen },
  { id: '微積分', name: '微積分 / Calculus', icon: Infinity },
];

const DEFAULT_FORMULAS: Formula[] = [
  {
    "id": "ohms_law",
    "name": "歐姆定律",
    "category": "電路學",
    "latex": "V = I \\cdot R",
    "mathjs": "I * R",
    "variables": [
      { "symbol": "I", "name": "電流", "type": "current", "defaultUnit": "A" },
      { "symbol": "R", "name": "電阻", "type": "resistance", "defaultUnit": "Ω" }
    ],
    "result": { "symbol": "V", "name": "電壓", "type": "voltage", "defaultUnit": "V" },
    "note": "標準歐姆定律計算範例"
  }
];

// ==========================================
// VAR CELL COMPONENT
// ==========================================
function VarCell({ 
  symbol, value, onChange, status, unit, onUnitChange, unitOptions 
}: { 
  symbol: string, value: string, onChange: (v: string) => void, status: 'idle'|'result'|'error',
  unit: string, onUnitChange: (u: string) => void, unitOptions: any[]
}) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleBlur = () => setIsEditing(false);

  let displayClass = "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"; 
  if (value) displayClass = "text-blue-600 dark:text-blue-400 hover:text-blue-700 font-sans font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20";
  if (status === 'result') displayClass = "text-green-600 dark:text-green-400 font-sans font-bold bg-green-50 dark:bg-green-900/20";
  if (status === 'error') displayClass = "text-red-600 dark:text-red-400 font-sans font-bold bg-red-50 dark:bg-red-900/20 border-red-200";

  return (
    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-sm">
      {isEditing ? (
        <input 
          ref={inputRef} type="number"
          className="w-16 h-8 text-center text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-400 dark:border-blue-600 rounded outline-none font-sans text-sm"
          value={value} onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur} onKeyDown={e => e.key === 'Enter' && handleBlur()}
        />
      ) : (
        <div 
          className={cn("min-w-[2.5rem] h-8 flex items-center justify-center cursor-pointer rounded transition-colors px-1.5", displayClass, !value && status === 'idle' && "bg-gray-50 dark:bg-gray-800/50")}
          onClick={() => setIsEditing(true)}
          title={`點擊輸入 ${symbol}`}
        >
          {!value ? <span className="scale-90 opacity-70"><InlineMath math={symbol} /></span> : <span>{value}</span>}
        </div>
      )}
      <select 
        value={unit} onChange={(e) => onUnitChange(e.target.value)}
        className="h-8 text-xs font-medium text-gray-600 dark:text-gray-300 bg-transparent border-none outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-1"
      >
        {unitOptions.length === 0 && unit && <option value={unit}>{unit}</option>}
        {unitOptions.map(u => <option key={u.display} value={u.display}>{u.display}</option>)}
      </select>
    </div>
  );
}

// ==========================================
// FORMULA CARD 
// ==========================================

function FormulaCard({ formula, onDelete, onEdit, onCalcResult }: { formula: Formula, onDelete: (id: string) => void, onEdit: (f: Formula) => void, onCalcResult?: (entry: {id:string,name:string,inputs:Record<string,string>,result:string,time:string}) => void }) {
  const [expanded, setExpanded] = useState(false);
  
  // Note state
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(formula.note || '');
  const [savedNote, setSavedNote] = useState(formula.note || '');

  // Menu state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  // Calculation States
  // 把 variables 裡跟 result 重複的 symbol 過濾掉（防止 AI 生成時把目標結果也放進輸入變數）
  const allVars = [
    formula.result,
    ...formula.variables.filter(v => v.symbol !== formula.result.symbol),
  ];

  const [inputVals, setInputVals] = useState<Record<string, string>>({});
  const [inputUnits, setInputUnits] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    allVars.forEach(v => init[v.symbol] = v.defaultUnit);
    return init;
  });
  
  const [targetVar, setTargetVar] = useState<string | null>(null);
  const [computedValue, setComputedValue] = useState<number | string | null>(null);
  const [calcError, setCalcError] = useState('');

  const setResult = (sym: string, val: number | string) => {
    setTargetVar(sym);
    setComputedValue(val);
    onCalcResult?.({ id: formula.id, name: formula.name, inputs: {...inputVals}, result: String(val), time: new Date().toLocaleString('zh-TW') });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  useEffect(() => {
    const closeMenu = () => setShowContextMenu(false);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const handleSaveNote = async () => { 
    setSavedNote(noteDraft); 
    setIsNoteEditing(false); 
    try {
      await fetch(`/api/formulas/${formula.id}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteDraft })
      });
    } catch (e) { console.error("Failed to save note:", e); }
  };
  const handleCancelNote = () => { setNoteDraft(savedNote); setIsNoteEditing(false); };

  // 計算引擎：支援代數求解、微積分、矩陣、直接數值計算
  const handleCalculate = async () => {
    setCalcError('');
    setTargetVar(null);
    setComputedValue(null);

    try {
      const mode = formula.mode || detectMode(formula.mathjs);

      // 收集所有已填寫的變數值（轉 SI）
      const scope: Record<string, number> = {};
      for (const v of allVars) {
        const raw = inputVals[v.symbol];
        if (!raw || raw.trim() === '') continue;
        const u = inputUnits[v.symbol];
        const ratio = UNITS_DB[v.type]?.units.find(x => x.display === u)?.ratio || 1;
        const valNum = Number(raw);
        if (isNaN(valNum)) throw new Error(`變數 ${v.symbol} 的數字格式無效`);
        scope[v.symbol] = valNum * ratio;
      }

      if (mode === 'calculus') {
        await handleCalculus(scope);
      } else if (mode === 'matrix') {
        handleMatrix(scope);
      } else if (mode === 'evaluate') {
        handleEvaluate(scope);
      } else {
        await handleAlgebraic(scope);
      }
    } catch (err: any) {
      setCalcError(err.message || '計算發生錯誤');
    }
  };

  // 自動偵測計算模式
  function detectMode(expr: string): string {
    if (/\b(diff|derivative)\s*\(/.test(expr)) return 'calculus';
    if (/\b(integrate|int)\s*\(/.test(expr)) return 'calculus';
    if (/\b(det|inv|transpose|matrix)\s*\(/.test(expr)) return 'matrix';
    if (/\beval\s*\(/.test(expr)) return 'evaluate';
    return 'algebraic';
  }

  // 代數求解（原有邏輯）
  const handleAlgebraic = async (scope: Record<string, number>) => {
    const emptyVars = allVars.filter(v => !(v.symbol in scope));
    if (emptyVars.length !== 1) {
      throw new Error(`請保留「剛好 1 個」未知數。目前有 ${emptyVars.length} 個未填`);
    }
    const unknown = emptyVars[0];

    let eqStr = formula.mathjs;
    if (!eqStr.includes('=')) {
      eqStr = `${formula.result.symbol} = ${formula.mathjs}`;
    }

    const nerdamerCtx = (await import('nerdamer')).default;
    // @ts-ignore
    await import('nerdamer/Solve.js');

    let finalRoot: number | null = null;
    try {
      const solStr = nerdamerCtx(eqStr).solveFor(unknown.symbol).toString();
      const roots = solStr.split(',');
      for (const rootStr of roots) {
        try {
          const num = evaluate(rootStr, scope);
          if (typeof num === 'number' && !isNaN(num) && num > 0) { finalRoot = num; break; }
          else if (finalRoot === null && typeof num === 'number' && !isNaN(num)) { finalRoot = num; }
        } catch { /* skip */ }
      }
    } catch {
      try {
        const result = evaluate(formula.mathjs, scope);
        if (typeof result === 'number' && !isNaN(result)) {
          setResult(formula.result.symbol, result);
          return;
        }
      } catch { /* skip */ }
    }

    if (finalRoot === null) throw new Error("未能算出有意義的實數結果");
    setResult(unknown.symbol, finalRoot);
  };

  // 微積分計算
  const handleCalculus = async (scope: Record<string, number>) => {
    const nerdamerCtx = (await import('nerdamer')).default;
    // @ts-ignore
    await import('nerdamer/Calculus.js');

    let expr = formula.mathjs;

    // diff(expr, var) → 符號微分
    const diffMatch = expr.match(/diff\((.+),\s*(\w+)\)/);
    if (diffMatch) {
      const [, innerExpr, diffVar] = diffMatch;
      const result = nerdamerCtx.diff(innerExpr, diffVar);
      // 如果 scope 有值 → 代入數值，否則輸出符號結果
      if (Object.keys(scope).length > 0) {
        try {
          const num = evaluate(result.toString(), scope);
          if (typeof num === 'number') { setResult(formula.result.symbol, num); return; }
        } catch { /* 符號結果 */ }
      }
      setResult(formula.result.symbol, result.toTeX());
      return;
    }

    // integrate(expr, var) → 符號積分
    const intMatch = expr.match(/integrate\((.+),\s*(\w+)\)/);
    if (intMatch) {
      const [, innerExpr, intVar] = intMatch;
      const result = nerdamerCtx.integrate(innerExpr, intVar);
      if (Object.keys(scope).length > 0) {
        try {
          const num = evaluate(result.toString(), scope);
          if (typeof num === 'number') { setResult(formula.result.symbol, num); return; }
        } catch { /* 符號結果 */ }
      }
      setResult(formula.result.symbol, result.toTeX());
      return;
    }

    throw new Error("無法解析微積分表達式。格式：diff(expr, var) 或 integrate(expr, var)");
  };

  // 矩陣計算
  const handleMatrix = (scope: Record<string, number>) => {
    let expr = formula.mathjs;
    // 代入已知值
    for (const [sym, val] of Object.entries(scope)) {
      expr = expr.replace(new RegExp(`\\b${sym}\\b`, 'g'), String(val));
    }

    const result = evaluate(expr);
    if (typeof result === 'number') {
      setResult(formula.result.symbol, result);
    } else if (result?.toArray) {
      setResult(formula.result.symbol, JSON.stringify(result.toArray()));
    } else {
      setResult(formula.result.symbol, String(result));
    }
  };

  // 直接數值計算（fallback）
  const handleEvaluate = (scope: Record<string, number>) => {
    let expr = formula.mathjs;
    for (const [sym, val] of Object.entries(scope)) {
      expr = expr.replace(new RegExp(`\\b${sym}\\b`, 'g'), String(val));
    }
    const result = evaluate(expr);
    setResult(formula.result.symbol, typeof result === 'number' ? result : String(result));
  };

  const getDisplayValue = (symbol: string) => {
    if (symbol === targetVar && computedValue !== null) {
       if (typeof computedValue === 'string') return computedValue; // 符號結果直接顯示
       const vInfo = allVars.find(v => v.symbol === symbol);
       if (!vInfo) return '';
       const u = inputUnits[symbol];
       const ratio = UNITS_DB[vInfo.type]?.units.find(x => x.display === u)?.ratio || 1;
       const finalVal = computedValue / ratio;
       const precision = Number(localStorage.getItem('app_precision')) || 7;
       return Number(finalVal.toPrecision(precision)).toString();
    }
    return inputVals[symbol] || '';
  };

  return (
    <>
      <motion.div 
        layout onContextMenu={handleContextMenu}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 relative group h-full flex flex-col"
      >
        <div className="p-6 flex flex-col gap-5 flex-1">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 tracking-wider">
                {formula.category}
              </span>
            </div>
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors self-start"
            >
              <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{duration: 0.2}}><ChevronDown size={20} /></motion.div>
            </button>
          </div>

          {/* Titles */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{formula.name}</h3>
          </div>

          {/* KaTeX */}
          <div className="py-5 bg-gray-50/80 dark:bg-[#080808] rounded-2xl px-4 overflow-x-auto text-2xl border border-gray-100 dark:border-gray-800/80 w-full text-gray-800 dark:text-gray-200">
            <BlockMath math={formula.latex} />
          </div>

          {!expanded && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
              {isNoteEditing ? (
                <div className="space-y-3">
                  <textarea 
                    autoFocus value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                    className="w-full min-h-[80px] p-3 text-sm bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-gray-700 dark:text-gray-300 resize-none"
                    placeholder="輸入個人筆記..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={handleCancelNote} className="px-4 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">取消</button>
                    <button onClick={handleSaveNote} className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">確認</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setIsNoteEditing(true)} className="w-full min-h-[40px] p-3 text-[14px] bg-gray-50 dark:bg-gray-800/30 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 cursor-text hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors empty:before:content-['點擊此處新增個人筆記...'] empty:before:opacity-60">
                  {savedNote}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expanded View: Calculator Form */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0a0a0a] overflow-hidden"
            >
              <div className="p-6 space-y-5">
                <h4 className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Calculator size={14}/> 互動計算區
                </h4>
                
                {/* 公式顯示 */}
                <div className="w-full py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 overflow-x-auto text-xl text-center">
                  <BlockMath math={formula.latex} />
                </div>

                {/* 變數輸入列表 */}
                <div className="grid gap-2 mt-3">
                  {allVars.map(v => (
                    <div key={v.symbol} className="flex items-center gap-3">
                      <div className="w-20 text-right shrink-0">
                        <span className={cn("text-sm font-semibold", targetVar === v.symbol && computedValue !== null ? "text-green-600 dark:text-green-400" : "text-gray-700 dark:text-gray-300")}>
                          <InlineMath math={v.symbol} /> <span className="text-[11px] text-gray-400">({v.name})</span>
                        </span>
                      </div>
                      <VarCell
                        symbol={v.symbol}
                        value={getDisplayValue(v.symbol)}
                        onChange={(val) => {
                          setInputVals({...inputVals, [v.symbol]: val});
                          if (targetVar === v.symbol) setTargetVar(null);
                        }}
                        status={targetVar === v.symbol && computedValue !== null ? 'result' : 'idle'}
                        unit={inputUnits[v.symbol]}
                        onUnitChange={(u) => setInputUnits({...inputUnits, [v.symbol]: u})}
                        unitOptions={UNITS_DB[v.type]?.units || []}
                      />
                    </div>
                  ))}
                </div>

                {calcError && (
                  <div className="text-red-500 dark:text-red-400 text-sm flex items-center gap-1.5 mt-2 px-2">
                    <AlertCircle size={14}/> {calcError}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button onClick={handleCalculate} className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-lg active:scale-95 transition-all">
                    計算 / Calculate
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 mt-6">
                  <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">個人筆記</h4>
                  {isNoteEditing ? (
                    <div className="space-y-3">
                      <textarea autoFocus value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} className="w-full min-h-[80px] p-4 text-[15px] bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-gray-700 dark:text-gray-300 resize-y" placeholder="新增個人筆記..." />
                      <div className="flex gap-2 justify-end">
                        <button onClick={handleCancelNote} className="px-5 py-2 text-sm font-semibold text-gray-500 focus:outline-none">取消</button>
                        <button onClick={handleSaveNote} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl">確認</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => setIsNoteEditing(true)} className="w-full min-h-[60px] p-4 text-[15px] bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 cursor-text hover:bg-gray-50 dark:hover:bg-gray-750 empty:before:content-['點擊此處新增個人筆記...'] empty:before:opacity-50">
                      {savedNote}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Context Menu */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
            style={{ top: menuPos.y, left: menuPos.x }}
            className="fixed z-50 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden py-1"
          >
             <button onClick={() => { onEdit(formula); setShowContextMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700"><Edit size={16} /> 編輯公式</button>
             <button onClick={() => { onDelete(formula.id); setShowContextMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 size={16} /> 刪除公式</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ==========================================
// SETTINGS MODAL
// ==========================================

function SettingsModal({ isOpen, onClose, formulas }: { isOpen: boolean, onClose: () => void, formulas: Formula[] }) {
  const [precision, setPrecision] = useState(Number(localStorage.getItem('app_precision')) || 7);
  const [systemUnit, setSystemUnit] = useState(localStorage.getItem('app_system_unit') || 'metric');
  const [themeColor, setThemeColor] = useState(localStorage.getItem('app_theme_color') || 'blue');
  const [isResetting, setIsResetting] = useState(false);

  const handleSave = () => {
    localStorage.setItem('app_precision', precision.toString());
    localStorage.setItem('app_system_unit', systemUnit);
    localStorage.setItem('app_theme_color', themeColor);
    window.location.reload(); 
  };

  const handleFactoryReset = async () => {
    if (!window.confirm("⚠️ 警告：這將會清除您所有的自訂公式與個人筆記，並恢復為初始預設值。這項操作無法復原，是否確定？")) return;
    setIsResetting(true);
    
    // Clear Local Storage Settings
    localStorage.removeItem('app_precision');
    localStorage.removeItem('app_system_unit');
    localStorage.removeItem('app_theme_color');

    // Wipe all formulas from DB sequentially to avoid locking
    try {
      for (const f of formulas) {
        await fetch(`/api/formulas/${f.id}`, { method: 'DELETE' });
      }
    } catch(e) {
      console.error(e);
    }
    
    // Reload will trigger DB empty state and recreate defaults
    window.location.reload();
  };

  if (!isOpen) return null;
  
  const colorMap: Record<string, string> = {
    'blue': 'bg-blue-500', 'indigo': 'bg-indigo-500', 'emerald': 'bg-emerald-500', 'amber': 'bg-amber-500'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-900 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative z-10 custom-scrollbar border border-gray-200 dark:border-gray-800 flex flex-col"
      >
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-20">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><X size={20} /></button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Settings size={22}/> 全域設定</h2>
        </div>
        
        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-2">1. 計算引擎 (Calculation)</h3>
            <label className="block space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">小數點精確度 (有效數字)</span>
                <span className="text-sm font-bold text-blue-600">{precision} 位</span>
              </div>
              <input type="range" min="2" max="15" value={precision} onChange={e => setPrecision(Number(e.target.value))} className="w-full accent-blue-600" />
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-2">2. 單位系統 (Unit Systems)</h3>
            <label className="block space-y-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 block">全域預設度量衡</span>
              <select value={systemUnit} onChange={e => setSystemUnit(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 outline-none dark:text-white text-sm">
                <option value="metric">公制單位 (Metric / SI)</option>
                <option value="imperial">英制單位 (Imperial)</option>
              </select>
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-2">3. 介面視覺 (Appearance)</h3>
            <label className="block space-y-2">
               <span className="text-sm text-gray-600 dark:text-gray-400 block">介面主題強調色</span>
               <div className="flex gap-3">
                {['blue', 'indigo', 'emerald', 'amber'].map(color => (
                    <button key={color} onClick={() => setThemeColor(color)} className={cn("w-8 h-8 rounded-full border-[3px] transition-all relative", themeColor === color ? "border-gray-800 dark:border-white scale-110" : "border-transparent", colorMap[color])}>
                      {themeColor === color && <Check size={14} className="absolute inset-0 m-auto text-white" />}
                    </button>
                 ))}
               </div>
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-2">4. 開發者選項 (Developer Tools)</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">取得空白 JSON 模板</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">一鍵將標準格式設定檔複製到您的剪貼簿</div>
              </div>
              <button 
                onClick={() => {
                  const tpl = JSON.stringify({
                    id: "f_" + Date.now(),
                    name: "新公式名稱",
                    category: "分類",
                    latex: "",
                    mathjs: "",
                    variables: [
                      { symbol: "", name: "", type: "length", defaultUnit: "m" }
                    ],
                    result: { symbol: "", name: "", type: "length", defaultUnit: "m" }
                  }, null, 2);
                  navigator.clipboard.writeText(tpl).then(() => alert('空白模板已複製到剪貼簿！')).catch(()=>{});
                }} 
                className="px-4 py-2 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-sm font-bold transition-colors flex items-center gap-1"
              >
                <Copy size={16} /> 複製 JSON
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-red-100 dark:border-red-900/30">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 pb-2">危險操作 (Danger Zone)</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">恢復原廠設定</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">清除所有公式與設定，回到乾淨狀態</div>
              </div>
              <button onClick={handleFactoryReset} disabled={isResetting} className="px-4 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                {isResetting ? <Loader2 size={16} className="animate-spin" /> : "重設資料庫"}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 mt-auto">
          <button onClick={handleSave} disabled={isResetting} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors disabled:opacity-50">儲存並重新載入</button>
        </div>
      </motion.div>
    </div>
  )
}
// FORMULA BUILDER MODAL (Tabs: GUI, JSON)
// ==========================================

function VariableConfigRow({ 
  data, onChange, onRemove, hideRemove 
}: { 
  data: FormulaVariable & { _id: string }, onChange: (d: any) => void, onRemove?: () => void, hideRemove?: boolean 
}) {
  const typeOptions = Object.entries(UNITS_DB).map(([key, info]) => ({ value: key, label: info.label }));
  const unitOptions = UNITS_DB[data.type]?.units || [];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 relative">
      {!hideRemove && (
        <button onClick={onRemove} className="absolute right-3 top-3 sm:static sm:order-last p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
          <Trash2 size={16}/>
        </button>
      )}
      <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
        <label className="flex-1 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">符號</span>
          <input className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:text-white outline-none focus:border-blue-500" value={data.symbol} onChange={e => onChange({...data, symbol: e.target.value})} placeholder="例如: V" />
        </label>
        <label className="flex-[2] space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">名稱</span>
          <input className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:text-white outline-none focus:border-blue-500" value={data.name} onChange={e => onChange({...data, name: e.target.value})} placeholder="例如: 電壓" />
        </label>
        <label className="flex-[2] space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">物理量 (Type)</span>
          <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:text-white outline-none focus:border-blue-500" value={data.type} onChange={e => onChange({...data, type: e.target.value, defaultUnit: UNITS_DB[e.target.value]?.units[0]?.display || ''})}>
            {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>
        <label className="flex-1 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">預設單位</span>
          <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:text-white outline-none focus:border-blue-500" value={data.defaultUnit} onChange={e => onChange({...data, defaultUnit: e.target.value})}>
            {unitOptions.map(u => <option key={u.display} value={u.display}>{u.display}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function FormulaBuilderModal({ isOpen, onClose, onSave, initialData }: { isOpen: boolean, onClose: () => void, onSave: (f: Formula) => void, initialData?: Formula | null }) {
  const [activeTab, setActiveTab] = useState<'gui'|'json'|'ai'>('gui');
  const [error, setError] = useState('');

  // JSON State
  const [jsonInput, setJsonInput] = useState(initialData ? JSON.stringify(initialData, null, 2) : '');

  // Category State (Hoisted for all modes)
  const [globalCategory, setGlobalCategory] = useState(initialData?.category || '物理');

  // GUI State
  const [formBase, setFormBase] = useState({ 
    id: initialData?.id || `f_${Date.now()}`, 
    name: initialData?.name || '', 
    latex: initialData?.latex || '', 
    mathjs: initialData?.mathjs || '' 
  });
  
  const [formResult, setFormResult] = useState<(FormulaVariable & { _id: string })>(
    initialData ? { _id: 'res', ...initialData.result } : { _id: 'res', symbol: '', name: '', type: 'voltage', defaultUnit: 'V' }
  );

  const [formVars, setFormVars] = useState<(FormulaVariable & { _id: string })[]>(
    initialData ? initialData.variables.map((v, i) => ({ _id: `v_${i}`, ...v })) : [{ _id: 'v1', symbol: '', name: '', type: 'current', defaultUnit: 'A' }]
  );

  // AI 對話狀態
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<{role: 'user'|'ai', content: string}[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<Formula | null>(null);
  const aiChatRef = useRef<HTMLDivElement>(null);

  const handleAiGenerate = async () => {
    if (!aiInput.trim() || aiGenerating) return;
    const userMsg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiGenerating(true);
    setError('');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);
      const resp = await fetch('/api/ai/generate-formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg, history: aiMessages }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await resp.json();

      if (!resp.ok) throw new Error(data.error || '生成失敗');

      if (data.formula) {
        setAiPreview(data.formula);
        setGlobalCategory(data.formula.category || globalCategory);
        setAiMessages(prev => [...prev, { role: 'ai', content: `已生成公式「${data.formula.name}」，請確認預覽` }]);
      } else if (data.message) {
        setAiMessages(prev => [...prev, { role: 'ai', content: data.message }]);
      }
    } catch (err: any) {
      setError(err.message);
      setAiMessages(prev => [...prev, { role: 'ai', content: `錯誤：${err.message}` }]);
    } finally {
      setAiGenerating(false);
      setTimeout(() => aiChatRef.current?.scrollTo({ top: aiChatRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
  };

  const handleAiAccept = () => {
    if (!aiPreview) return;
    try {
      onSave(handleValidation(aiPreview));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleValidation = (parsed: any) => {
    const required = ['id', 'name', 'category', 'latex', 'mathjs', 'variables', 'result'];
    for (const field of required) {
      if (!parsed[field]) throw new Error(`缺少必須欄位: ${field}`);
    }
    if (!Array.isArray(parsed.variables)) throw new Error("variables 必須是陣列");
    return parsed;
  }

  const handleSaveJson = () => {
    setError('');
    try {
      if (!jsonInput.trim()) throw new Error("請輸入 JSON 內容");
      const parsed = handleValidation({ ...JSON.parse(jsonInput), category: globalCategory });
      onSave(parsed);
    } catch (e: any) {
      setError(e.message || "無效的 JSON 格式，解析失敗。");
    }
  };

  const handleSaveGui = () => {
    setError('');
    try {
      if (!formBase.name || !formBase.latex || !formBase.mathjs || !formResult.symbol) throw new Error("請至「一般模式」填寫所有必填的基礎欄位與目標符號");
      if (formVars.some(v => !v.symbol || !v.type)) throw new Error("請確保所有「輸入變數」皆已填寫符號與選擇物理量");

      const result: Formula = {
        id: formBase.id,
        name: formBase.name,
        category: globalCategory,
        latex: formBase.latex,
        mathjs: formBase.mathjs,
        result: { symbol: formResult.symbol, name: formResult.name, type: formResult.type, defaultUnit: formResult.defaultUnit },
        variables: formVars.map(v => ({ symbol: v.symbol, name: v.name, type: v.type, defaultUnit: v.defaultUnit }))
      };
      
      onSave(handleValidation(result));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConfirmAction = () => {
      if (activeTab === 'gui') handleSaveGui();
      else if (activeTab === 'json') handleSaveJson();
      else if (activeTab === 'ai') handleAiAccept();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative z-10 custom-scrollbar border border-gray-200 dark:border-gray-800 flex flex-col"
      >
        {/* Modal Header & Tabs */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-20">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><X size={20} /></button>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pr-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">建立公式卡片</h2>
            
            <div className="flex items-center gap-2">
               <span className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center"><Tag size={16} className="mr-1.5"/> 標籤分類：</span>
               <input 
                  list="category-options" 
                  className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm dark:text-white outline-none focus:border-blue-500 w-32 sm:w-40 transition-colors" 
                  value={globalCategory} 
                  onChange={e => setGlobalCategory(e.target.value)} 
                  placeholder="新增標籤..." 
               />
               <datalist id="category-options">
                 <option value="物理"/>
                 <option value="電路學"/>
                 <option value="力學"/>
                 <option value="微積分"/>
                 <option value="熱力學"/>
                 <option value="流體力學"/>
               </datalist>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('gui')} className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all", activeTab === 'gui' ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800")}>
              <LayoutTemplate size={16}/> 一般模式
            </button>
            <button onClick={() => setActiveTab('json')} className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all", activeTab === 'json' ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800")}>
              <Code size={16}/> 程式碼模式
            </button>
            <button onClick={() => setActiveTab('ai')} className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all", activeTab === 'ai' ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800")}>
              <Sparkles size={16}/> AI 生成
            </button>
          </div>
        </div>
        
        {/* Modal Body */}
        <div className="flex-1 p-6 flex flex-col min-h-[300px]">
          {activeTab === 'gui' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-2">1. 基礎設定 (Basic Info)</h3>
                <div className="flex gap-4">
                  <label className="flex-[2] space-y-1"><span className="text-xs text-gray-500">公式名稱 (Name)</span><input className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 outline-none dark:text-white" value={formBase.name} onChange={e => setFormBase({...formBase, name: e.target.value})} placeholder="例如: 歐姆定律"/></label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-2">2. 數學引擎 (Mathematical Engines)</h3>
                <div className="flex flex-col gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-gray-500 flex justify-between">顯示用公式 (LaTeX)</span>
                    <input className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 outline-none font-mono text-sm dark:text-white" value={formBase.latex} onChange={e => setFormBase({...formBase, latex: e.target.value})} placeholder="V = I \cdot R"/>
                  </label>
                  {formBase.latex && (
                    <div className="py-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl px-4 text-xl border border-blue-100 dark:border-blue-900/30 overflow-x-auto dark:text-gray-200 flex justify-center">
                      <BlockMath math={formBase.latex} />
                    </div>
                  )}
                  <label className="space-y-1 mt-2">
                    <span className="text-xs text-gray-500">背後計算腳本 (MathJS)</span>
                    <input className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 outline-none font-mono text-sm dark:text-white" value={formBase.mathjs} onChange={e => setFormBase({...formBase, mathjs: e.target.value})} placeholder="I * R"/>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-2">3. 變數與單位設定 (Variables Configuration)</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 rounded-2xl relative">
                    <div className="absolute -top-2.5 left-4 px-2 bg-white dark:bg-gray-900 text-xs font-bold text-green-600 dark:text-green-500 rounded">目標結果 (Output Result)</div>
                    <VariableConfigRow data={formResult} onChange={setFormResult} hideRemove />
                  </div>
                  
                  <div className="pt-2 flex flex-col gap-3">
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-500 px-1">↓ 計算所需變數 (Input Variables)</div>
                    {formVars.map((fv, idx) => (
                      <VariableConfigRow key={fv._id} data={fv} onChange={(newData) => {
                        const newVars = [...formVars]; newVars[idx] = newData; setFormVars(newVars);
                      }} onRemove={() => setFormVars(formVars.filter(v => v._id !== fv._id))} />
                    ))}
                    <button onClick={() => setFormVars([...formVars, { _id: `v_${Date.now()}`, symbol: '', name: '', type: 'length', defaultUnit: 'm' }])} className="mt-1 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex justify-center items-center gap-2">
                       <Plus size={16}/> 加入變數卡片
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="flex-1 flex flex-col h-full space-y-4">
              <p className="text-sm text-gray-500">請將符合 Formula Object 規格的 JSON 字串貼入下方。</p>
              <textarea
                value={jsonInput} onChange={(e) => setJsonInput(e.target.value)}
                className="w-full flex-1 p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl font-mono text-sm text-gray-800 dark:text-gray-300 focus:outline-none focus:border-blue-500 resize-none whitespace-pre"
                placeholder={`{\n  "id": "ohms_law",\n  "name": "歐姆定律",\n  "category": "電路學",\n  "latex": "V = I \\\\cdot R",\n...`}
              />
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="flex-1 flex flex-col h-full">
              {/* 對話區 */}
              <div ref={aiChatRef} className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[400px] px-1">
                {aiMessages.length === 0 && !aiPreview && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4">
                      <Sparkles size={28} className="text-indigo-600 dark:text-indigo-400"/>
                    </div>
                    <p className="text-sm text-gray-500 max-w-sm">描述你想建立的公式，AI 會自動生成完整的 LaTeX 排版與單位設定。</p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      {['牛頓第二運動定律', '電容充電時間常數 τ=RC', '理想氣體方程式'].map(s => (
                        <button key={s} onClick={() => { setAiInput(s); }} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap",
                      msg.role === 'user'
                        ? "bg-indigo-600 text-white rounded-br-md"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {aiGenerating && (
                  <div className="flex justify-start">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md">
                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* AI 預覽卡 */}
              {aiPreview && (
                <div className="mb-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">AI 生成預覽</span>
                    <button onClick={() => { setAiPreview(null); setAiMessages(prev => [...prev, { role: 'user', content: '重新生成' }]); handleAiGenerate(); }} className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1">
                      <RotateCcw size={12}/> 重新生成
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">{aiPreview.category}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{aiPreview.name}</span>
                  </div>
                  <div className="py-3 bg-white dark:bg-gray-900 rounded-xl px-4 text-xl border border-gray-100 dark:border-gray-800 overflow-x-auto text-center">
                    <BlockMath math={aiPreview.latex} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">結果: {aiPreview.result.symbol} ({aiPreview.result.name})</span>
                    {aiPreview.variables.map((v, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">{v.symbol} ({v.name}) [{v.defaultUnit}]</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 輸入欄 */}
              <div className="flex gap-2">
                <input
                  value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
                  disabled={aiGenerating}
                  className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white disabled:opacity-50"
                  placeholder={aiPreview ? "輸入修正指令... 例如：把單位改成 CGS" : "描述你想建立的公式..."}
                />
                <button onClick={handleAiGenerate} disabled={aiGenerating || !aiInput.trim()} className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors">
                  <Send size={18}/>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span className="font-mono break-all">{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer — sticky 避免被長變數列表擠出可視區 */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur rounded-b-3xl shrink-0 sticky bottom-0 z-20">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">取消</button>

          {activeTab === 'ai' ? (
            <button onClick={handleAiAccept} disabled={!aiPreview} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl shadow-md transition-colors flex items-center gap-2">
              <Check size={18} /> 確認加入公式
            </button>
          ) : (
            <button onClick={handleConfirmAction} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-colors flex items-center gap-2">
              <Check size={18} /> 儲存設定檔
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// 單位換算工具
// ==========================================

function UnitConverterModal({ onClose }: { onClose: () => void }) {
  const typeEntries = Object.entries(UNITS_DB);
  const [selectedType, setSelectedType] = useState(typeEntries[0]?.[0] || 'length');
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [inputVal, setInputVal] = useState('1');

  const currentUnits = UNITS_DB[selectedType]?.units || [];

  useEffect(() => {
    if (currentUnits.length >= 2) {
      setFromUnit(currentUnits[0].display);
      setToUnit(currentUnits[1].display);
    }
  }, [selectedType]);

  const fromRatio = currentUnits.find(u => u.display === fromUnit)?.ratio || 1;
  const toRatio = currentUnits.find(u => u.display === toUnit)?.ratio || 1;
  const result = (Number(inputVal) || 0) * fromRatio / toRatio;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Repeat2 size={20}/> 單位換算</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-5">
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm dark:text-white outline-none">
            {typeEntries.map(([key, info]) => <option key={key} value={key}>{info.label}</option>)}
          </select>

          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <input type="number" value={inputVal} onChange={e => setInputVal(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-lg font-mono dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" />
              <select value={fromUnit} onChange={e => setFromUnit(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm dark:text-white outline-none">
                {currentUnits.map(u => <option key={u.display} value={u.display}>{u.display}</option>)}
              </select>
            </div>

            <button onClick={() => { setFromUnit(toUnit); setToUnit(fromUnit); }} className="p-2 text-gray-400 hover:text-blue-500 transition-colors shrink-0">
              <ArrowRight size={20}/>
            </button>

            <div className="flex-1 space-y-2">
              <div className="w-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl p-3 text-lg font-mono text-green-700 dark:text-green-400 text-right">
                {isNaN(result) ? '—' : result.toPrecision(7).replace(/\.?0+$/, '')}
              </div>
              <select value={toUnit} onChange={e => setToUnit(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm dark:text-white outline-none">
                {currentUnits.map(u => <option key={u.display} value={u.display}>{u.display}</option>)}
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">1 {fromUnit} = {(fromRatio/toRatio).toPrecision(6).replace(/\.?0+$/,'')} {toUnit}</p>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// MAIN APP ARCHITECTURE
// ==========================================

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('app_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showUnitConverter, setShowUnitConverter] = useState(false);
  const [calcHistory, setCalcHistory] = useState<{id: string, name: string, inputs: Record<string,string>, result: string, time: string}[]>(() => {
    try { return JSON.parse(localStorage.getItem('mathbox_history') || '[]'); } catch { return []; }
  });
  
  const [formulas, setFormulas] = useState<Formula[]>([]);

  useEffect(() => {
    // 取得資料庫中的 Formula
    fetch('/api/formulas')
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          setFormulas(data);
        } else {
          // 若資料庫為空，寫入初始預設值
          setFormulas(DEFAULT_FORMULAS);
          DEFAULT_FORMULAS.forEach(f => {
            fetch('/api/formulas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(f)
            });
          });
        }
      })
      .catch(err => {
        console.error("無法連線至 SQLite 後端，顯示本機預設公式。請確定有啟動後端：", err);
        setFormulas(DEFAULT_FORMULAS);
      });
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('app_dark_mode', String(darkMode));
  }, [darkMode]);

  // 全域鍵盤快捷鍵
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 不在 input/textarea 內才觸發
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setIsAddModalOpen(true); }
      if (e.key === 'h' || e.key === 'H') { e.preventDefault(); setShowHistory(prev => !prev); }
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); setShowUnitConverter(prev => !prev); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setDarkMode(prev => !prev); }
      if (e.key === '/' || e.key === 'f') { e.preventDefault(); document.querySelector<HTMLInputElement>('[data-search]')?.focus(); }
      if (e.key === 'Escape') { setShowHistory(false); setShowUnitConverter(false); setIsSettingsOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const dynamicCategories = React.useMemo(() => {
    const defaultIds = CATEGORIES.map(c => c.id);
    const uniqueTags = new Set(formulas.map(f => f.category));
    
    const extra: {id: string, name: string, icon: any}[] = [];
    uniqueTags.forEach(tag => {
      if (!defaultIds.includes(tag) && tag) {
        extra.push({ id: tag, name: tag, icon: Tag });
      }
    });
    return [...CATEGORIES, ...extra];
  }, [formulas]);

  const filteredFormulas = formulas.filter(f => {
    const matchCat = activeCategory === 'all' || f.category === activeCategory;
    if (!searchQuery.trim()) return matchCat;
    const q = searchQuery.toLowerCase();
    return matchCat && (f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.latex.toLowerCase().includes(q) || f.variables.some(v => v.name.toLowerCase().includes(q)));
  });

  // 計算歷史持久化
  const addHistory = useCallback((entry: typeof calcHistory[0]) => {
    setCalcHistory(prev => {
      const next = [entry, ...prev].slice(0, 50);
      localStorage.setItem('mathbox_history', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/formulas/${id}`, { method: 'DELETE' });
      setFormulas(prev => prev.filter(f => f.id !== id));
    } catch(e) { console.error(e); }
  };

  const handleAddFormula = async (newFormula: Formula) => {
    try {
      await fetch('/api/formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFormula)
      });
      setFormulas(prev => {
        const exists = prev.find(f => f.id === newFormula.id);
        if (exists) {
          return prev.map(f => f.id === newFormula.id ? newFormula : f);
        }
        return [newFormula, ...prev];
      });
      setIsAddModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("無法儲存公式，後端未開啟！");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300 font-sans selection:bg-blue-500/30">
      
      {/* SIDEBAR */}
      <aside className="w-72 border-r border-gray-200 dark:border-gray-800/80 bg-white dark:bg-gray-950 flex flex-col hidden md:flex z-10 transition-colors duration-300">
        <div className="h-[72px] flex items-center px-6 border-b border-gray-100 dark:border-gray-800/80 shrink-0">
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-500">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <Calculator size={22} className="stroke-[2.5]" />
            </div>
            <h1 className="font-bold text-[17px] tracking-tight text-gray-900 dark:text-white">MathBox</h1>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          <div className="p-4 space-y-8">
            <div>
              <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-3">目錄/學科</h2>
              <ul className="space-y-1">
                {dynamicCategories.map(cat => (
                  <li key={cat.id}>
                    <button onClick={() => setActiveCategory(cat.id)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all text-left", activeCategory === cat.id ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900")}>
                      <cat.icon size={18} className={cn("shrink-0", activeCategory === cat.id ? "text-blue-600 dark:text-blue-500" : "opacity-50")} />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50/50 dark:bg-[#0a0a0a]">
        {/* HEADER */}
        <header className="h-[72px] px-4 sm:px-8 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-2xl flex justify-between items-center sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"><Menu size={20} /></button>
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input data-search value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Escape' && (e.currentTarget.blur(), setSearchQuery(''))} placeholder="搜尋公式... (按 / 聚焦)" className="pl-9 pr-3 py-2 w-56 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-white transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowUnitConverter(true)} className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 rounded-xl dark:hover:bg-gray-800 transition-colors" title="單位換算 (U)">
              <Repeat2 size={20} />
            </button>
            <button onClick={() => setShowHistory(true)} className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 rounded-xl dark:hover:bg-gray-800 transition-colors relative" title="計算歷史 (H)">
              <Clock size={20} />
              {calcHistory.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />}
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 text-amber-500 dark:text-indigo-400 hover:bg-amber-50 rounded-xl dark:hover:bg-indigo-900/30 transition-colors" title="切換主題 (D)">
              {darkMode ? <Sun size={20} fill="currentColor" /> : <Moon size={20} fill="currentColor" />}
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 rounded-xl dark:hover:bg-gray-800 transition-colors" title="設定">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-6 pb-24">
            <div className="mb-8 px-1">
              <h1 className="text-[28px] font-bold text-gray-900 dark:text-white mb-2 tracking-tight">儀表板</h1>
              <p className="text-gray-500 dark:text-gray-400 text-[15px]">支援 JSON Config 匯入與動態單位換算。</p>
            </div>

            <motion.div layout className="flex flex-wrap items-start content-start gap-5 sm:gap-6">
              <AnimatePresence mode='popLayout'>
                {filteredFormulas.map(formula => (
                  <motion.div key={formula.id} layout transition={{ duration: 0.2 }} className="flex-auto sm:flex-initial w-full md:w-fit min-w-[320px] max-w-full">
                    <FormulaCard
                      formula={formula}
                      onDelete={handleDelete}
                      onEdit={(f) => { setEditingFormula(f); setIsAddModalOpen(true); }}
                      onCalcResult={addHistory}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </main>

      {/* FAB - 呼叫新增 JSON Modal */}
      <button onClick={() => setIsAddModalOpen(true)} className="fixed right-8 bottom-8 h-[60px] w-[60px] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95 group z-40 border border-blue-500/50">
        <Plus size={30} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      <AnimatePresence>
        {isAddModalOpen && (
           <FormulaBuilderModal 
             isOpen={isAddModalOpen} 
             onClose={() => { setIsAddModalOpen(false); setEditingFormula(null); }} 
             onSave={handleAddFormula} 
             initialData={editingFormula}
           />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && <SettingsModal formulas={formulas} isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
      </AnimatePresence>

      {/* 計算歷史 Slide Panel */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[90]">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowHistory(false)} />
            <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:25,stiffness:200}}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
              <div className="h-[72px] px-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Clock size={18}/> 計算歷史</h2>
                <div className="flex gap-2">
                  <button onClick={() => { setCalcHistory([]); localStorage.removeItem('mathbox_history'); }} className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg">清除</button>
                  <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={18}/></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {calcHistory.length === 0 && <p className="text-sm text-gray-400 text-center py-10">尚無計算紀錄</p>}
                {calcHistory.map((h, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{h.name}</span>
                      <span className="text-[10px] text-gray-400">{h.time}</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {Object.entries(h.inputs).filter(([,v]) => v).map(([k,v]) => <span key={k} className="mr-2">{k}={v}</span>)}
                    </div>
                    {h.result && <div className="text-sm font-mono text-green-600 dark:text-green-400 mt-1">= {h.result}</div>}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 單位換算 Modal */}
      <AnimatePresence>
        {showUnitConverter && <UnitConverterModal onClose={() => setShowUnitConverter(false)} />}
      </AnimatePresence>

    </div>
  );
}
