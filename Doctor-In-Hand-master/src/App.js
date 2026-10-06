import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import {
  Activity, Stethoscope, AlertCircle, CheckCircle, Search, Trash2,
  Download, FileText, Menu, X, Clock, Info, Moon, Sun, HeartPulse, Cpu, Database
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { TextPlugin } from 'gsap/TextPlugin';

import { symptomsList } from './symptoms';
import { generatePDF } from './pdfGenerator';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);
gsap.registerPlugin(useGSAP, TextPlugin);

function App() {
  const [appLoading, setAppLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('check');
  const [inputText, setInputText] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [isClearing, setIsClearing] = useState(false);

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const container = useRef();

  // Apply Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('predictionHistory');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // ---------------------------------------------------------------------------
  // GSAP: Startup Sequence
  // ---------------------------------------------------------------------------
  useGSAP(() => {
    if (appLoading) {
      const tl = gsap.timeline({
        onComplete: () => {
          // Fade out loader
          gsap.to('.gsap-loader', {
            opacity: 0,
            y: -50,
            duration: 0.8,
            ease: 'power4.inOut',
            onComplete: () => setAppLoading(false)
          });
        }
      });

      // Initial state
      gsap.set('.loader-title-1', { text: "" });
      gsap.set('.loader-title-2', { text: "" });
      gsap.set('.loader-title-3', { text: "" });

      tl.to('.loader-title-1', { text: "Initializing", duration: 0.8, ease: "none" })
        .to('.loader-title-2', { text: "Finetuned BioBERT", duration: 1.2, ease: "none" }, "+=0.1")
        .to('.loader-title-3', { text: "System", duration: 0.5, ease: "none" }, "+=0.1")

        .from('.loader-icon', { scale: 0, rotation: -180, duration: 1, ease: "back.out(1.7)" }, "-=2")

        .to('.loader-progress', { width: '100%', duration: 2.5, ease: 'power2.inOut' }, "-=0.5")
        .to('.loader-status', {
          text: { value: "System Ready", delimeter: "" },
          duration: 0.5,
          ease: "none",
          delay: 0.2
        });

    } else {
      // Main App Entrances (re-run these once the app is visible)
      // Ambient Background Blobs
      gsap.to('.ambient-blob-1', {
        x: '+=30', y: '-=30', duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut'
      });
      gsap.to('.ambient-blob-2', {
        x: '-=20', y: '+=40', duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut'
      });

      const tl = gsap.timeline();
      tl.from('.gsap-sidebar', { x: -80, opacity: 0, duration: 1, ease: 'power4.out' })
        .from('.gsap-sidebar-item', { x: -30, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.6')
        .from('.gsap-header', { y: -40, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
        .from('.gsap-input-card', { scale: 0.9, opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
        .from('.gsap-chip', { scale: 0, opacity: 0, stagger: 0.02, duration: 0.4, ease: 'back.out(2)' }, '-=0.4');
    }
  }, { scope: container, dependencies: [appLoading] });

  // ---------------------------------------------------------------------------
  // GSAP: Tab Switching Transitions
  // ---------------------------------------------------------------------------
  useGSAP(() => {
    if (!appLoading) {
      gsap.fromTo('.gsap-tab-content',
        { opacity: 0, y: 15, filter: 'blur(5px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out' }
      );
    }
  }, { dependencies: [activeTab, appLoading], scope: container });

  // ---------------------------------------------------------------------------
  // GSAP: Results Entry
  // ---------------------------------------------------------------------------
  useGSAP(() => {
    if (results && !appLoading) {
      const tl = gsap.timeline();

      tl.from('.gsap-results-card', {
        y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'back.out(1.2)'
      })
        .from('.gsap-result-bar', { width: 0, duration: 1.2, ease: 'power4.out' }, '-=0.6')
        .to('.gsap-confidence-text', {
          innerText: results[0].confidence,
          snap: { innerText: 1 },
          duration: 2,
          ease: 'power2.out',
          onUpdate: function () {
            this.targets()[0].innerText = Math.round(this.targets()[0].innerText) + "%";
          }
        }, '-=1.2');
    }
  }, { dependencies: [results, appLoading], scope: container });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const toggleSymptom = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));

      // Remove from text (simple replace)
      const regex = new RegExp(`(, )?${symptom}`, 'i');
      setInputText(prev => prev.replace(regex, '').trim());

    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
      // Append to text
      setInputText(prev => {
        const trimmed = prev.trim();
        return trimmed ? trimmed + ", " + symptom : symptom;
      });
    }
  };

  const handlePredict = async () => {
    const text = inputText.trim();
    if (!text) {
      setError("Please describe your symptoms or select from the list.");
      // Error Shake
      gsap.fromTo('.gsap-input-card',
        { x: -10 },
        { x: 10, duration: 0.08, repeat: 5, yoyo: true, ease: 'sine.inOut', onComplete: () => gsap.set('.gsap-input-card', { x: 0 }) }
      );
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    // Pulse Animation during loading
    gsap.to('.gsap-analyze-btn', { scale: 0.95, duration: 0.5, yoyo: true, repeat: -1 });

    try {
      const response = await axios.post('http://localhost:8000/predict', { text, num_results: 5 });
      await new Promise(r => setTimeout(r, 1000));

      const newResults = response.data;
      setResults(newResults);

      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toJSON(),
        symptoms: text,
        topPrediction: newResults[0],
        allResults: newResults
      };

      const updatedHistory = [newHistoryItem, ...history].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem('predictionHistory', JSON.stringify(updatedHistory));

    } catch (err) {
      console.error("Analysis Engine Error: ", err);
      setError('Could not connect to the analysis engine.');
    } finally {
      setLoading(false);
      gsap.killTweensOf('.gsap-analyze-btn');
      gsap.to('.gsap-analyze-btn', { scale: 1, duration: 0.3 });
    }
  };

  const clearAll = () => {
    setInputText('');
    setSelectedSymptoms([]);
    setResults(null);
    setError('');
    // Implode effect
    gsap.fromTo('.gsap-input-card', { scale: 0.95 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
  };

  const clearHistory = () => {
    if (window.confirm("Clear all history?")) {
      setIsClearing(true);
      // Simulate network/processing delay for better UX
      setTimeout(() => {
        setHistory([]);
        localStorage.removeItem('predictionHistory');
        setIsClearing(false);
      }, 1500);
    }
  };

  const deleteHistoryItem = (id, e) => {
    e.stopPropagation();
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('predictionHistory', JSON.stringify(updatedHistory));
  };

  const downloadReport = (predictionResults = null, symptomText = null) => {
    const dataToPrint = predictionResults || results;
    if (!dataToPrint) return;

    // Prompt for Patient Details
    const patientName = window.prompt("Enter Patient Name:", "Guest");
    if (patientName === null) return;

    const patientAge = window.prompt("Enter Patient Age:", "N/A");
    if (patientAge === null) return;

    // Success bounce
    gsap.to('.gsap-download-btn', {
      scale: 0.9, duration: 0.1, yoyo: true, repeat: 1, onComplete: () => {
        const text = symptomText || (inputText + " " + selectedSymptoms.join(" ")).trim();
        generatePDF(dataToPrint, text, new Date().toLocaleString(), patientName, patientAge);
      }
    });
  };

  // Hover Animations
  const onEnterScale = (e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.3, ease: 'back.out(2)' });
  const onLeaveScale = (e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'power2.out' });

  const getChartData = (currentResults) => {
    if (!currentResults) return null;
    return {
      labels: currentResults.map(r => r.disease),
      datasets: [{
        label: 'Confidence (%)',
        data: currentResults.map(r => r.confidence),
        backgroundColor: 'rgba(14, 165, 233, 0.25)',
        borderColor: '#0ea5e9',
        borderWidth: 2,
        pointBackgroundColor: '#0ea5e9',
        pointBorderColor: '#fff',
      }],
    };
  };

  return (
    <div ref={container} className="relative min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">

      {/* -------------------- LOADER OVERLAY -------------------- */}
      {appLoading && (
        <div className="gsap-loader fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="loader-icon w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-sky-500/30">
              <Cpu size={40} className="animate-spin-slow" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight flex flex-col md:flex-row items-center gap-2">
            <span className="loader-title-1"></span>
            <span className="loader-title-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400"></span>
            <span className="loader-title-3"></span>
          </h1>

          <div className="flex items-center gap-3 text-slate-400 text-sm mb-12 font-mono h-6">
            <span className="flex items-center gap-2"><Database size={14} /> <span className="loader-status">Loading Models...</span></span>

          </div>

          <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="loader-progress h-full bg-gradient-to-r from-sky-500 to-emerald-400 w-0"></div>
          </div>
        </div>
      )}

      {/* -------------------- MAIN APP -------------------- */}
      {!appLoading && (
        <div className="flex flex-col md:flex-row min-h-screen transition-colors duration-500">

          {/* AMBIENT BACKGROUND */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="ambient-blob-1 absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
            <div className="ambient-blob-2 absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-sky-400/20 rounded-full blur-3xl"></div>
          </div>

          {/* MOBILE HEADER */}
          <div className="md:hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 flex justify-between items-center shadow-sm z-20 sticky top-0 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-600 rounded-lg flex items-center justify-center text-white">
                <Stethoscope size={18} />
              </div>
              DoctorInHand
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setDarkMode(!darkMode)} className="p-2">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-600 dark:text-slate-300">
                {sidebarOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className={`
            gsap-sidebar
            fixed md:sticky top-0 left-0 h-screen w-64 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-700 z-10 duration-300 ease-IN-OUT transform
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            flex flex-col transition-colors
          `}>
            <div className="p-6">
              <div className="flex items-center gap-3 font-bold text-xl text-slate-900 dark:text-white mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-200 dark:shadow-none animate-pulse-slow">
                  <Stethoscope size={24} />
                </div>
                DoctorInHand
              </div>

              <nav className="space-y-2">
                {[
                  { id: 'check', icon: Activity, label: 'Symptom Check' },
                  { id: 'history', icon: FileText, label: 'History' },
                  { id: 'about', icon: Info, label: 'About' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                    onMouseEnter={onEnterScale}
                    onMouseLeave={onLeaveScale}
                    className={`
                      gsap-sidebar-item
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors 
                      ${activeTab === item.id
                        ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }
                    `}
                  >
                    <item.icon size={20} /> {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-700">
              <div className="gsap-sidebar-item flex items-center justify-between mb-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Appearance</span>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg bg-white dark:bg-slate-600 text-slate-600 dark:text-yellow-400 shadow-sm transition-all hover:rotate-12"
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
              <div className="gsap-sidebar-item bg-slate-900 dark:bg-black rounded-xl p-4 text-white">
                <h4 className="font-bold text-sm mb-1">Medical Disclaimer</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This AI tool is for educational use only. Always consult a doctor.
                </p>
              </div>
            </div>
          </aside>

          {/* OVERLAY */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-slate-900/20 dark:bg-black/50 z-0 md:hidden backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* MAIN CONTENT */}
          <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto h-screen transition-colors relative z-1">
            <div className="max-w-5xl mx-auto gsap-tab-content">

              {/* -------------------- SYMPTOM CHECK TAB -------------------- */}
              {activeTab === 'check' && (
                <div>
                  <header className="mb-10 gsap-header">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
                      Check Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">Symptoms</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">
                      Describe how you feel or select symptoms for an instant AI analysis.
                    </p>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* INPUT SECTION */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="gsap-input-card bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors">

                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">
                              Description
                            </label>
                            <textarea
                              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-sky-500 transition-all outline-none resize-none text-slate-700 dark:text-slate-200 min-h-[120px]"
                              placeholder="e.g. I have a severe headache and nausea..."
                              value={inputText}
                              onChange={(e) => setInputText(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">
                              Common Symptoms
                            </label>
                            <div className="h-60 overflow-y-auto overflow-x-hidden p-2 pr-2 custom-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {symptomsList.map(sym => (
                                <button
                                  key={sym}
                                  onClick={(e) => {
                                    // Quick Pop Animation
                                    gsap.fromTo(e.currentTarget,
                                      { scale: 1 },
                                      { scale: 1.15, duration: 0.1, ease: 'power1.out', yoyo: true, repeat: 1 }
                                    );
                                    toggleSymptom(sym);
                                  }}
                                  className={`
                                    gsap-chip transform-gpu
                                    text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200
                                    ${selectedSymptoms.includes(sym)
                                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-200 dark:shadow-none ring-2 ring-sky-300 dark:ring-sky-600 scale-105'
                                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }
                                  `}
                                >
                                  {sym}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 flex gap-4">
                          <button
                            onClick={handlePredict}
                            disabled={loading}
                            onMouseEnter={onEnterScale}
                            onMouseLeave={onLeaveScale}
                            className="gsap-analyze-btn flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg shadow-sky-200 dark:shadow-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                          >
                            {loading ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Search size={22} /> Analyze Now
                              </>
                            )}
                          </button>
                          <button
                            onClick={clearAll}
                            onMouseEnter={onEnterScale}
                            onMouseLeave={onLeaveScale}
                            className="px-5 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-2xl transition-colors"
                          >
                            <Trash2 size={24} />
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 animate-bounce">
                          <AlertCircle className="shrink-0" />
                          <p>{error}</p>
                        </div>
                      )}

                      {/* NEXT STEPS SUGGESTIONS (Fills the gap) */}
                      {results && (
                        <div className="gsap-input-card bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors animate-fade-in-up">
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <CheckCircle size={20} className="text-emerald-500" /> Recommended Next Steps
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-left group">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 group-hover:scale-110 transition-transform">
                                <Stethoscope size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                  Consult a {results[0].specialist || 'Doctor'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Find {results[0].specialist ? `${results[0].specialist}s` : 'doctors'} nearby
                                </p>
                              </div>
                            </button>

                            <button className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-left group">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300 group-hover:scale-110 transition-transform">
                                <Activity size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Monitor Symptoms</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Track daily progress</p>
                              </div>
                            </button>
                          </div>

                          <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 flex items-start gap-3">
                            <Info size={18} className="text-slate-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              Based on the prediction of <strong>{results[0].disease}</strong>, we suggest immediate professional consultation if symptoms persist for more than 24 hours.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RESULTS SECTION */}
                    <div className="lg:col-span-5 space-y-6">
                      {results ? (
                        <div className="space-y-6">

                          {/* TOP CARD */}
                          <div className="gsap-results-card bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-sky-100 dark:border-none relative overflow-hidden transition-colors">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 dark:bg-sky-900/30 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse"></div>

                            <div className="relative z-10">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="text-sm font-bold text-sky-500 uppercase tracking-wider mb-1">Top Prediction</p>
                                  <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">{results[0].disease}</h2>
                                </div>
                                <div className="gsap-confidence-text bg-sky-500 text-white font-bold px-3 py-1 rounded-full text-sm min-w-[50px] text-center">
                                  0%
                                </div>
                              </div>

                              <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden mb-6">
                                <div
                                  className="gsap-result-bar h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full"
                                  style={{ width: `${results[0].confidence}%` }}
                                />
                              </div>

                              <button
                                onClick={() => downloadReport()}
                                onMouseEnter={onEnterScale}
                                onMouseLeave={onLeaveScale}
                                className="gsap-download-btn w-full py-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors group"
                              >
                                <Download size={18} className="text-sky-500 group-hover:scale-110 transition-transform" />
                                Download Report PDF
                              </button>
                            </div>
                          </div>

                          {/* CHART CARD */}
                          <div className="gsap-results-card bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                              <Activity size={18} className="text-sky-500" /> Analysis Breakdown
                            </h3>
                            <div className="h-[250px] w-full flex items-center justify-center">
                              <Radar
                                data={getChartData(results)}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  scales: {
                                    r: {
                                      ticks: { display: false, backdropColor: 'transparent' },
                                      grid: { color: darkMode ? '#334155' : '#f1f5f9' },
                                      pointLabels: {
                                        font: { size: 10, weight: 'bold', family: 'sans-serif' },
                                        color: darkMode ? '#94a3b8' : '#64748b'
                                      }
                                    }
                                  },
                                  plugins: { legend: { display: false } }
                                }}
                              />
                            </div>
                          </div>

                          {/* OTHER RESULTS */}
                          <div className="gsap-results-card bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Other Possibilities</h3>
                            <div className="space-y-3">
                              {results.slice(1).map((res, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-default hover:pl-5 duration-300">
                                  <span className="font-medium text-slate-600 dark:text-slate-300">{res.disease}</span>
                                  <div className="flex flex-col items-end gap-1 min-w-[100px]">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800 dark:text-white text-sm">{Math.round(res.confidence)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-sky-500 rounded-full"
                                        style={{ width: `${res.confidence}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="gsap-input-card h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                          {loading ? (
                            <>
                              <div className="w-24 h-24 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center text-sky-500 mb-6 relative">
                                <div className="absolute inset-0 border-4 border-sky-200 dark:border-sky-800 rounded-full animate-ping opacity-25"></div>
                                <Activity size={48} className="animate-spin-slow" />
                              </div>
                              <h3 className="text-2xl font-bold text-sky-600 dark:text-sky-400 mb-2 animate-pulse">Analyzing Symptoms...</h3>
                              <p className="text-slate-400 dark:text-slate-500 max-w-xs">
                                Consultng Knowledge Base & BioBERT Model...
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-4 animate-heart-beat">
                                <HeartPulse size={40} />
                              </div>
                              <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 mb-2">Ready to Analyze</h3>
                              <p className="text-slate-400 dark:text-slate-500 max-w-xs">
                                Input your symptoms on the left to get a detailed AI assessment.
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- HISTORY TAB -------------------- */}
              {activeTab === 'history' && (
                <div className="max-w-4xl mx-auto">
                  <header className="mb-10 flex justify-between items-end gsap-header">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
                        Recent <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">History</span>
                      </h1>
                      <p className="text-slate-500 dark:text-slate-400 text-lg">
                        View your past prediction results.
                      </p>
                    </div>
                    {history.length > 0 && (
                      <button
                        onClick={clearHistory}
                        disabled={isClearing}
                        onMouseEnter={onEnterScale}
                        onMouseLeave={onLeaveScale}
                        className={`
                          flex items-center gap-2 font-medium px-4 py-2 rounded-xl transition-all
                          ${isClearing
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30'
                          }
                        `}
                      >
                        {isClearing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-600 dark:border-slate-500 dark:border-t-slate-300 rounded-full animate-spin" />
                            Clearing...
                          </>
                        ) : (
                          <>
                            <Trash2 size={18} /> Clear History
                          </>
                        )}
                      </button>
                    )}
                  </header>

                  <div className={`transition-opacity duration-300 ${isClearing ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                    {history.length === 0 ? (
                      <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 gsap-input-card">
                        <Clock size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500">No History Found</h3>
                        <p className="text-slate-400 dark:text-slate-500 mt-2">Your predictions will appear here.</p>
                        <button
                          onClick={() => setActiveTab('check')}
                          className="mt-6 text-sky-600 dark:text-sky-400 font-bold hover:underline"
                        >
                          Go to Symptom Checker
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                          {history.map((item) => (
                            <motion.div
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                              key={item.id}
                              className="gsap-input-card bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-700 transition-colors relative group"
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div>
                                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                    {new Date(item.date).toLocaleDateString()} &bull; {new Date(item.date).toLocaleTimeString()}
                                  </div>
                                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                    {item.topPrediction.disease}
                                    <span className="ml-3 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-1 rounded-lg text-sm">
                                      {Math.round(item.topPrediction.confidence)}% Confidence
                                    </span>
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => downloadReport(item.allResults, item.symptoms)}
                                    onMouseEnter={onEnterScale}
                                    onMouseLeave={onLeaveScale}
                                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                                  >
                                    <Download size={16} /> PDF
                                  </button>
                                  <button
                                    onClick={(e) => deleteHistoryItem(item.id, e)}
                                    className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                    title="Delete Entry"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">Symptoms:</span> {item.symptoms}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* -------------------- ABOUT TAB -------------------- */}
              {activeTab === 'about' && (
                <div className="max-w-3xl mx-auto">
                  <header className="mb-10 text-center gsap-header">
                    <div className="w-20 h-20 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-sky-200 dark:shadow-none mx-auto mb-6">
                      <Stethoscope size={40} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                      About <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">Doctor in Hand</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
                      Advanced AI-powered healthcare assistant.
                    </p>
                  </header>

                  <div className="space-y-8">
                    <div className="gsap-input-card bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Activity className="text-sky-500" /> How it Works
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                        This application utilizes BioBERT (Biomedical Bidirectional Encoder Representations from Transformers), a state-of-the-art language model pre-trained on large-scale biomedical text corpora.
                      </p>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                          <CheckCircle size={18} className="text-green-500 shrink-0 mt-1" />
                          <span>Fine-tuned on a dataset of symptoms and corresponding disease labels.</span>
                        </li>
                        <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                          <CheckCircle size={18} className="text-green-500 shrink-0 mt-1" />
                          <span>Processes natural language input to understand context and nuance.</span>
                        </li>
                      </ul>
                    </div>



                    <div className="text-center pt-8 border-t border-slate-200 dark:border-slate-800 gsap-header">
                      <p className="text-slate-400 dark:text-slate-600 text-sm">
                        Developed by KIET-II TEAM 3 CAI &copy; 2025
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div >
      )
      }
    </div >
  );
}

export default App;
