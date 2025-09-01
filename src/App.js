import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Plus,
  Download,
  Trash2,
  Activity,
  Heart,
  Dumbbell,
  Moon,
  Coffee,
  Pause,
  BookOpen,
  FileText,
  TimerReset,
  LayoutGrid,
  Settings as SettingsIcon,
  Check,
} from "lucide-react";

// --- Kleine Helferfunktionen ---
const fmtDate = (d) => new Date(d).toLocaleDateString();
const todayISO = () => new Date().toISOString().slice(0, 10);
const clamp = (n, min = 0, max = 10) => Math.max(min, Math.min(max, Number(n) || 0));

const DAILY_TIPS = [
  "Sanft ist stark: 5 tiefe Atemzüge vor jeder Aktivität.",
  "Mikro-Pause: 90 Sekunden Schulter- und Nackenlockerung.",
  "Trinken nicht vergessen – 1 Glas Wasser pro Stunde.",
  "Bewege dich im Wohlfühlbereich, nicht im Schmerzbereich.",
  "Notiere heute 1 Trigger & 1 Entlastung.",
  "Schlafhygiene: 30 Min. vor dem Schlafen Bildschirme meiden.",
  "Kurze Selbstumarmung: 10 Sekunden – Oxytocin-Booster.",
];

const DEFAULT_EXERCISES = [
  {
    id: "stretch-5",
    title: "5-Minuten-Entlastungsdehnen",
    icon: "🧘‍♀️",
    duration: 5,
    spoons: 1,
    steps: [
      "Nacken kreisen (sanft) – 30s",
      "Schultern vor/zurück – 45s",
      "Brustöffnung an der Wand – 60s",
      "Waden- & Oberschenkeldehnung – 2 Min.",
      "Lockeres Ausschütteln – 45s",
    ],
  },
  {
    id: "breath-4-7-8",
    title: "Atemübung 4-7-8",
    icon: "🌬️",
    duration: 3,
    spoons: 0,
    steps: ["4 Sekunden einatmen", "7 Sekunden Luft halten", "8 Sekunden ausatmen", "4–6 Wiederholungen"],
  },
  {
    id: "body-scan",
    title: "Mini Body-Scan",
    icon: "🧠",
    duration: 5,
    spoons: 0,
    steps: [
      "Aufrecht oder liegend – Augen schließen",
      "Aufmerksamkeit von Kopf bis Fuß wandern",
      "Bei Spannung: 1 tiefer Atem + sanft lösen",
    ],
  },
];

const STORAGE_KEY = "fibroBalanceDataV1";

export default function FibroBalanceApp() {
  const [activeTab, setActiveTab] = useState("home");
  const [tipsIndex, setTipsIndex] = useState(() => Math.floor(Math.random() * DAILY_TIPS.length));

  // --- Gesundheitsdaten ---
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    date: todayISO(),
    pain: 4,
    fatigue: 4,
    mood: 3,
    sleep: 7,
    stress: 3,
    notes: "",
  });

  // --- Löffel (Energie) ---
  const [spoons, setSpoons] = useState({ date: todayISO(), total: 10, used: 0 });

  // --- Daten aus dem LocalStorage laden ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setEntries(parsed.entries || []);
        setSpoons(parsed.spoons || { date: todayISO(), total: 10, used: 0 });
      }
    } catch (e) {
      console.warn("Laden des Speichers fehlgeschlagen", e);
    }
  }, []);

  // --- Daten speichern ---
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, spoons }));
    } catch (e) {
      console.warn("Speichern des Speichers fehlgeschlagen", e);
    }
  }, [entries, spoons]);

  // Löffel bei Tageswechsel zurücksetzen
  useEffect(() => {
    const id = setInterval(() => {
      const today = todayISO();
      if (spoons.date !== today) setSpoons({ date: today, total: spoons.total, used: 0 });
    }, 60_000);
    return () => clearInterval(id);
  }, [spoons.date, spoons.total]);

  const last14 = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-14);
  }, [entries]);

  const averages = useMemo(() => {
    if (!entries.length) return { pain: 0, fatigue: 0, sleep: 0, stress: 0 };
    const sum = entries.reduce(
      (acc, e) => ({
        pain: acc.pain + e.pain,
        fatigue: acc.fatigue + e.fatigue,
        sleep: acc.sleep + e.sleep,
        stress: acc.stress + e.stress,
      }),
      { pain: 0, fatigue: 0, sleep: 0, stress: 0 }
    );
    const n = entries.length;
    const r = (x) => Math.round((x / n) * 10) / 10;
    return { pain: r(sum.pain), fatigue: r(sum.fatigue), sleep: r(sum.sleep), stress: r(sum.stress) };
  }, [entries]);

  const addEntry = () => {
    const newEntry = {
      date: form.date,
      pain: clamp(form.pain),
      fatigue: clamp(form.fatigue),
      mood: clamp(form.mood, 1, 5),
      sleep: clamp(form.sleep, 0, 14),
      stress: clamp(form.stress),
      notes: (form.notes || "").slice(0, 500),
    };
    const exists = entries.find((e) => e.date === form.date);
    if (exists) setEntries(entries.map((e) => (e.date === form.date ? newEntry : e)));
    else setEntries([...entries, newEntry]);
    setActiveTab("home");
  };

  const deleteEntry = (date) => setEntries(entries.filter((e) => e.date !== date));

  const completeExercise = (ex) => setSpoons((s) => ({ ...s, used: clamp(s.used + ex.spoons, 0, s.total) }));

  const exportCSV = () => {
    const header = ["date", "pain", "fatigue", "mood", "sleep", "stress", "notes"];
    const rows = entries.map((e) => header.map((k) => ("" + (e[k] ?? "")).replace(/\n|\r/g, " ")).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fibro-balance-entries-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    if (!confirm("Alle Daten wirklich löschen?")) return;
    setEntries([]);
    setSpoons({ date: todayISO(), total: 10, used: 0 });
    localStorage.removeItem(STORAGE_KEY);
  };

  const tipOfDay = DAILY_TIPS[tipsIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white text-slate-800">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <LayoutGrid className="w-6 h-6" />
          <h1 className="text-xl font-semibold">Fibro Balance</h1>
          <span className="ml-auto text-sm text-slate-500">Dein sanfter Fibromyalgie-Begleiter</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid gap-6">
        {/* Tabs */}
        <nav className="flex gap-2 flex-wrap">
          {[
            { id: "home", label: "Home" },
            { id: "tracker", label: "Tracker" },
            { id: "exercises", label: "Übungen" },
            { id: "knowledge", label: "Wissen" },
            { id: "settings", label: "Einstellungen" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={
                "px-4 py-2 rounded-2xl text-sm border shadow-sm transition " +
                (activeTab === t.id
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white hover:bg-slate-50")
              }
            >
              {t.label}
            </button>
          ))}
        </nav>

        {activeTab === "home" && (
          <section className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 grid gap-4">
              <div className="p-4 bg-white rounded-2xl shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5" />
                  <h2 className="font-semibold">Heute</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <QuickStat label="Schmerz" value={form.pain} icon={<Heart className="w-4 h-4" />} />
                  <QuickStat label="Müdigkeit" value={form.fatigue} icon={<Moon className="w-4 h-4" />} />
                  <QuickStat label="Schlaf (h)" value={form.sleep} icon={<Coffee className="w-4 h-4" />} />
                  <QuickStat label="Stress" value={form.stress} icon={<Dumbbell className="w-4 h-4" />} />
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setActiveTab("tracker")} className="btn-primary">
                    <Plus className="w-4 h-4 mr-1" /> Symptome eintragen
                  </button>
                  <button onClick={() => setActiveTab("exercises")} className="btn-secondary">
                    <Pause className="w-4 h-4 mr-1" /> Übung starten
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl shadow">
                <h3 className="font-semibold mb-2">Verlauf (14 Tage)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={last14.map((e) => ({ ...e, label: fmtDate(e.date) }))} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="pain" name="Schmerz" dot={false} />
                      <Line type="monotone" dataKey="fatigue" name="Müdigkeit" dot={false} />
                      <Line type="monotone" dataKey="stress" name="Stress" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <aside className="grid gap-4">
              <div className="p-4 bg-white rounded-2xl shadow">
                <div className="text-sm text-slate-500 mb-1">Tagesimpuls</div>
                <p className="text-slate-800">{tipOfDay}</p>
                <button className="mt-3 btn-secondary" onClick={() => setTipsIndex((i) => (i + 1) % DAILY_TIPS.length)}>
                  Neuer Impuls
                </button>
              </div>

              <SpoonsCard spoons={spoons} setSpoons={setSpoons} />

              <div className="p-4 bg-white rounded-2xl shadow">
                <h3 className="font-semibold mb-2">Durchschnittswerte</h3>
                <ul className="text-sm grid grid-cols-2 gap-y-1">
                  <li>Schmerz: <b>{averages.pain}</b></li>
                  <li>Müdigkeit: <b>{averages.fatigue}</b></li>
                  <li>Schlaf: <b>{averages.sleep} h</b></li>
                  <li>Stress: <b>{averages.stress}</b></li>
                </ul>
              </div>
            </aside>
          </section>
        )}

        {activeTab === "tracker" && (
          <section className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-4 bg-white rounded-2xl shadow">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" /> Eintrag erstellen
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Datum" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
                <Input label="Schmerz (0–10)" type="number" value={form.pain} onChange={(v) => setForm({ ...form, pain: v })} />
                <Input label="Müdigkeit (0–10)" type="number" value={form.fatigue} onChange={(v) => setForm({ ...form, fatigue: v })} />
                <Input label="Stimmung (1–5)" type="number" value={form.mood} onChange={(v) => setForm({ ...form, mood: v })} />
                <Input label="Schlaf (Std.)" type="number" value={form.sleep} onChange={(v) => setForm({ ...form, sleep: v })} />
                <Input label="Stress (0–10)" type="number" value={form.stress} onChange={(v) => setForm({ ...form, stress: v })} />
                <div className="sm:col-span-2">
                  <label className="block text-sm mb-1">Notizen</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Trigger, Wetter, Ernährung, Medikamente …"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={addEntry} className="btn-primary">
                  <Check className="w-4 h-4 mr-1" /> Speichern
                </button>
                <button onClick={() => setActiveTab("home")} className="btn-secondary">Abbrechen</button>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow">
              <h3 className="font-semibold mb-3">Letzte Einträge</h3>
              <ul className="space-y-2 max-h-80 overflow-auto pr-1">
                {[...entries]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 10)
                  .map((e) => (
                    <li key={e.date} className="p-3 rounded-xl border flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{fmtDate(e.date)}</div>
                        <div className="text-xs text-slate-500">Schmerz {e.pain} · Müdigkeit {e.fatigue} · Schlaf {e.sleep}h · Stress {e.stress}</div>
                        {e.notes && <div className="text-sm mt-1">{e.notes}</div>}
                      </div>
                      <button onClick={() => deleteEntry(e.date)} className="text-red-600 hover:bg-red-50 rounded-lg p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </section>
        )}

        {activeTab === "exercises" && (
          <section className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 grid gap-4">
              {DEFAULT_EXERCISES.map((ex) => (
                <div key={ex.id} className="p-4 bg-white rounded-2xl shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <span>{ex.icon}</span> {ex.title}
                      </h3>
                      <div className="text-sm text-slate-500">Dauer ~{ex.duration} Min · Löffel {ex.spoons}</div>
                    </div>
                    <button className="btn-primary" onClick={() => completeExercise(ex)}>
                      <Pause className="w-4 h-4 mr-1" /> Fertig
                    </button>
                  </div>
                  <ol className="mt-3 grid gap-1 list-decimal list-inside text-sm">
                    {ex.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <SpoonsCard spoons={spoons} setSpoons={setSpoons} />
          </section>
        )}

        {activeTab === "knowledge" && (
          <section className="grid gap-4">
            <Card title="Schmerz & Stress">
              Stress kann Schmerzen verstärken. Kurze Atempausen senken die Muskelanspannung und verbessern die Schmerzwahrnehmung.
            </Card>
            <Card title="Schlafhygiene">
              Regelmäßige Zeiten, abends weniger Bildschirmzeit und eine kühle, dunkle Umgebung fördern besseren Schlaf.
            </Card>
            <Card title="Pacing (Energie-Management)">
              Plane Aktivitäten in kleinen Portionen und gönn dir bewusst Pausen, bevor die Erschöpfung kommt.
            </Card>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-2xl shadow">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> Daten</h3>
              <div className="flex gap-2">
                <button onClick={exportCSV} className="btn-secondary">
                  <Download className="w-4 h-4 mr-1" /> CSV exportieren
                </button>
                <button onClick={resetAll} className="btn-danger">
                  <Trash2 className="w-4 h-4 mr-1" /> Alles löschen
                </button>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><TimerReset className="w-5 h-5" /> Löffel-Einstellungen</h3>
              <label className="block text-sm mb-1">Tages-Löffel (Energie)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={spoons.total}
                onChange={(e) => setSpoons({ ...spoons, total: clamp(e.target.value, 1, 30) })}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </section>
        )}
      </main>

      <style>{`
        .btn-primary { @apply inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm; }
        .btn-secondary { @apply inline-flex items-center px-4 py-2 rounded-xl bg-white border hover:bg-slate-50 transition shadow-sm; }
        .btn-danger { @apply inline-flex items-center px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition shadow-sm; }
      `}</style>
    </div>
  );
}

function QuickStat({ label, value, icon }) {
  return (
    <div className="p-3 rounded-xl border bg-white flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function SpoonsCard({ spoons, setSpoons }) {
  const left = Math.max(0, spoons.total - spoons.used);
  return (
    <div className="p-4 bg-white rounded-2xl shadow">
      <h3 className="font-semibold mb-2 flex items-center gap-2"><Coffee className="w-5 h-5" /> Energie (Löffel)</h3>
      <div className="text-sm mb-2">Heute: {left} / {spoons.total} Löffel übrig</div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[{ name: "verbraucht", v: spoons.used }, { name: "verfügbar", v: left }]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="v" name="Löffel" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn-secondary" onClick={() => setSpoons({ ...spoons, used: Math.max(0, spoons.used - 1) })}>-1</button>
        <button className="btn-secondary" onClick={() => setSpoons({ ...spoons, used: Math.min(spoons.total, spoons.used + 1) })}>+1</button>
        <button className="btn-secondary" onClick={() => setSpoons({ ...spoons, used: 0 })}>Zurücksetzen</button>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="p-4 bg-white rounded-2xl shadow">
      <h3 className="font-semibold mb-2 flex items-center gap-2"><BookOpen className="w-5 h-5" /> {title}</h3>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange }) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

