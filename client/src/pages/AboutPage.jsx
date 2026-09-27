import { useNavigate } from 'react-router-dom';
import {
  LayersIcon,
  ZapIcon,
  ServerRackIcon,
  ActivityIcon,
  BarChartIcon,
  SlidersIcon,
  DatabaseIcon,
  CheckCircleIcon
} from '../components/Icons.jsx';

const STACK = [
  { tech: 'ML Microservice', role: 'Inference Engine', desc: 'FastAPI, XGBoost, Scikit-learn, Pandas (Port 8000)' },
  { tech: 'Backend SCADA API', role: 'Telemetry Historian', desc: 'Node.js, Express, MongoDB Atlas, REST (Port 4000)' },
  { tech: 'Operator HMI Client', role: 'DCS Frontend', desc: 'React 18, Vite, Tailwind CSS, Recharts' },
  { tech: 'Facility Infrastructure', role: 'Compute & Grid', desc: 'Docker Containerized, 34.5kV Substation Emulation' }
];

const ML_TASKS = [
  {
    title: 'Electricity Demand Forecasting',
    engine: 'XGBoost Extreme Gradient Boosting',
    desc: 'Continuous autoregressive load forecasting using 25 operational parameters including environmental psychrometrics, CRAC thermal delta, and cyclical lag profiles (1h to 168h).'
  },
  {
    title: 'Substation Anomaly Detection',
    engine: 'Random Forest Ensemble Classifier',
    desc: 'Instantaneous screening of multi-sensor telemetry vectors to classify nominal vs anomalous operations (thermal overshoots, cooling valve degradation, and electrical surge trips).'
  }
];

const PIPELINE_STAGES = [
  { step: '01', title: 'Sensor Telemetry Ingestion', desc: 'Psychrometric & electrical telemetry streams polled at 3000ms intervals.' },
  { step: '02', title: 'Feature Preprocessing', desc: 'Fourier cyclical transforms (sin/cos of hour/month) & rolling statistics.' },
  { step: '03', title: 'Dual Model Inference', desc: 'Simultaneous regression (XGBoost) and classification (Random Forest) via FastAPI.' },
  { step: '04', title: 'Alarm Trip Enunciation', desc: 'Dynamic thresholding against warning (10,000 kW) and critical trip (10,500 kW) limits.' },
  { step: '05', title: 'MongoDB Historian Archive', desc: 'Permanent sequence of events (SOE) storage for post-incident audit.' },
  { step: '06', title: 'DCS Operator Interface', desc: 'Sub-second rendering of telemetry curves, annunciator bays, and dispatch tools.' },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-10 max-w-6xl mx-auto">

      {/* ── Facility Substation Overview Card ───────────────────────────── */}
      <div className="control-panel p-6 rounded-xl bg-[#091426] border border-[#162947] shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#14263f] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <LayersIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
                DCS Architecture & Infrastructure Topology
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                Facility Substation Specification · SCADA Integration Stack · Model Pipeline
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded text-xs font-mono font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SUBSTATION FEEDER ENERGIZED
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#07101f] border border-[#13243d]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Facility Name</span>
            <span className="text-slate-100 font-bold">Iowa Hyperscale DC-01</span>
          </div>
          <div className="p-3 rounded-lg bg-[#07101f] border border-[#13243d]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Grid Interconnection</span>
            <span className="text-cyan-400 font-bold">34.5 kV Dual-Feed</span>
          </div>
          <div className="p-3 rounded-lg bg-[#07101f] border border-[#13243d]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Substation Capacity</span>
            <span className="text-slate-100 font-bold">15.0 MW (Peak 18 MW)</span>
          </div>
          <div className="p-3 rounded-lg bg-[#07101f] border border-[#13243d]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Baseline</span>
            <span className="text-emerald-400 font-bold">~9.7 MW (PUE 1.15)</span>
          </div>
        </div>
      </div>

      {/* ── Machine Learning Inference Specifications ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ML_TASKS.map((task, idx) => (
          <div key={idx} className="control-panel p-5 rounded-xl bg-[#091426] border border-[#162947] shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#14263f] pb-2 mb-3">
                <h3 className="text-xs font-bold text-cyan-400 uppercase font-mono tracking-wider">
                  {task.title}
                </h3>
                <span className="text-[9px] px-2 py-0.5 rounded bg-[#0e1c31] text-slate-400 font-mono">
                  TASK #{idx + 1}
                </span>
              </div>
              <div className="mb-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Champion Architecture:</span>
                <span className="text-xs font-bold text-slate-200 font-mono">{task.engine}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                {task.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── SCADA Ingestion & Processing Pipeline ──────────────────────── */}
      <div className="control-panel p-6 rounded-xl bg-[#091426] border border-[#162947] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#14263f] pb-3 mb-4">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            End-to-End SCADA Ingestion & ML Pipeline
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            Deterministic 3.0s Polling Loop
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.step} className="p-3.5 rounded-lg bg-[#07101f] border border-[#13243d] flex gap-3">
              <span className="w-7 h-7 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                {stage.step}
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-200 font-mono">{stage.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{stage.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Technology Stack Architecture ─────────────────────────────── */}
      <div className="control-panel p-6 rounded-xl bg-[#091426] border border-[#162947] shadow-xl">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono mb-4 border-b border-[#14263f] pb-2">
          Industrial Technology Stack
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {STACK.map((item, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-[#07101f] border border-[#13243d]">
              <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold block mb-1">
                {item.role}
              </span>
              <h3 className="text-xs font-bold text-slate-100 font-mono">{item.tech}</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Navigation Shortcuts to Operations ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/')}
          className="control-panel p-4 rounded-xl bg-[#091426] border border-[#162947] hover:border-cyan-500/50 hover:bg-[#0c1a30] transition-all text-left group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400 font-mono mb-1">
            <span>Live Telemetry Monitor</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">View synchronous 3-second power stream and node bay annunciator.</p>
        </button>

        <button
          onClick={() => navigate('/analytics')}
          className="control-panel p-4 rounded-xl bg-[#091426] border border-[#162947] hover:border-cyan-500/50 hover:bg-[#0c1a30] transition-all text-left group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400 font-mono mb-1">
            <span>Forecasting Analytics</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">Inspect regression residuals, load driver weights, and alarm decision matrix.</p>
        </button>

        <button
          onClick={() => navigate('/whatif')}
          className="control-panel p-4 rounded-xl bg-[#091426] border border-[#162947] hover:border-cyan-500/50 hover:bg-[#0c1a30] transition-all text-left group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400 font-mono mb-1">
            <span>What-If Simulation Lab</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">Emulate custom thermal, environmental, and compute load dispatch scenarios.</p>
        </button>
      </div>

    </div>
  );
}
