"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { surveySchema, type Section, type RatingGroupSection } from '@/data/schema';

type Answers = { [id: string]: unknown };
type Ratings = { [id: string]: number };

export default function SurveyPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [ratings, setRatings] = useState<Ratings>({});
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [ratingPage, setRatingPage] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  // gists removed from UI to avoid unused state
  const [errorsByQuestionId, setErrorsByQuestionId] = useState<Record<string, string[]>>({});
  const [ackText, setAckText] = useState('');
  const sections = surveySchema.sections;
  const [examplesByQuestionId, setExamplesByQuestionId] = useState<Record<string, string[]>>({});
  const [descriptionsByQuestionId, setDescriptionsByQuestionId] = useState<Record<string, Record<string, string>>>({});
  const [hoverTip, setHoverTip] = useState<{ id: string; text: string } | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [warnedOnceByQuestionId, setWarnedOnceByQuestionId] = useState<Record<string, boolean>>({});
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [navHistory, setNavHistory] = useState<Array<{ s: number; q: number; r: number }>>([]);

  const shouldSkipQuestion = useCallback((q: Section['questions'][number]): boolean => {
    const crm = answers['current_crm'] as string | undefined;
    if (crm === 'no_crm') {
      if (q.id === 'nps' || q.id === 'licenses_count' || q.id === 'time_spent') return true;
    }
    return false;
  }, [answers]);

  // examples fetched via /api/ai/examples and shown via tooltip; no local hardcoded strings

  function computeProgressPercent() {
    // Count total prompts across all sections (questions + rating items)
    const total = sections.reduce((acc, sec) => {
      if ('type' in sec && sec.type === 'rating_group') return acc + sec.items.length;
      if ('questions' in sec) return acc + sec.questions.length;
      return acc;
    }, 0);

    // Count visited prompts up to the current pointer, treating skipped as answered
    let visited = 0;
    for (let s = 0; s < sections.length; s++) {
      const sec = sections[s];
      const isCurrent = s === activeSectionIndex;
      if ('type' in sec && sec.type === 'rating_group') {
        if (!isCurrent) {
          visited += sec.items.length;
        } else {
          const pageSize = 5; // rating section shows 5 per page
          const upto = Math.min(sec.items.length, (ratingPage + 1) * pageSize);
          visited += upto;
        }
      } else if ('questions' in sec) {
        if (!isCurrent) {
          visited += sec.questions.length;
        } else {
          visited += Math.min(sec.questions.length, activeQuestionIndex + 1);
        }
      }
      if (s === activeSectionIndex) break;
    }

    if (total === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((visited / total) * 100)));
  }

  function getTopMetricsHint(): string {
    // Fetch from LLM examples endpoint synchronously is not possible here; provide cached string if already fetched via state (set elsewhere)
    return examplesByQuestionId['top_metrics']?.join('; ') || 'Loading examples…';
  }

  const role = answers['primary_role'] as string | undefined;
  const hasTopExamples = !!examplesByQuestionId['top_metrics'];
  useEffect(() => {
    async function ensureExamples() {
      if (hasTopExamples) return;
      try {
        const res = await fetch('/api/ai/examples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: 'top_metrics', roleId: role }),
        });
        const data = await res.json();
        setExamplesByQuestionId(prev => ({ ...prev, top_metrics: data.examples || [] }));
      } catch {}
    }
    ensureExamples();
  }, [role, hasTopExamples]);

  useEffect(() => {
    // Fetch short descriptions for manual tasks options
    async function ensureDescriptions() {
      const sec = sections.find(s => 'questions' in s && (s as Section).questions.some(q => q.id === 'manual_tasks')) as Section | undefined;
      if (!sec) return;
      if (descriptionsByQuestionId['manual_tasks']) return;
      const q = sec.questions.find(q => q.id === 'manual_tasks');
      if (!q) return;
      try {
        const res = await fetch('/api/ai/describe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: 'manual_tasks', options: q.options || [] }),
        });
        const data = await res.json();
        const got: Record<string, string> = data.descriptions || {};
        // Fallbacks if model returns empty strings
        const fallback: Record<string, string> = {
          'Contact/Lead research': 'Finding contact info and context manually',
          'Writing personalized ice-breaker emails': 'Crafting tailored first emails by hand',
          'Logging calls or meeting notes': 'Typing call summaries into the CRM',
          'Updating deal stages / close dates': 'Manually moving deals and changing dates',
          'Building or editing reports': 'Creating dashboards and tweaking filters',
          'Importing data from LinkedIn or other tools': 'Copying data between tools into CRM',
          'Preparing pre-meeting summaries': 'Compiling account highlights before meetings',
          'Adding email summaries in CRM': 'Pasting email recaps into records',
          'Maintaining data quality': 'Fixing duplicates and missing fields',
          'Integrating campaign data to leads/contacts': 'Linking campaign touchpoints to people',
          'Other (specify)': 'Another manual task not listed',
        };
        const merged: Record<string, string> = {};
        (q.options || []).forEach(o => {
          const v = got[o.label];
          merged[o.label] = (v && v.trim().length > 0 ? v : fallback[o.label]) || '';
        });
        setDescriptionsByQuestionId(prev => ({ ...prev, manual_tasks: merged }));
      } catch {}
    }
    ensureDescriptions();
  }, [sections, descriptionsByQuestionId]);

  // Auto-skip ineligible questions based on answers (e.g., no CRM)
  useEffect(() => {
    const sectionLocal = sections[activeSectionIndex] as Section | RatingGroupSection;
    if (!('questions' in sectionLocal)) return;
    const section = sectionLocal as Section;
    let idx = activeQuestionIndex;
    while (section.questions[idx] && shouldSkipQuestion(section.questions[idx])) {
      idx++;
    }
    if (idx !== activeQuestionIndex) {
      if (idx < section.questions.length) {
        setActiveQuestionIndex(idx);
      } else {
        const isLastSection = activeSectionIndex >= sections.length - 1;
        if (!isLastSection) {
          setActiveSectionIndex(i => Math.min(sections.length - 1, i + 1));
          setActiveQuestionIndex(0);
          setRatingPage(0);
        }
      }
    }
  }, [sections, activeSectionIndex, activeQuestionIndex, answers, shouldSkipQuestion]);

  function getContextPrefix(q: Section['questions'][number]): string | undefined {
    const nps = answers['nps'] as number | undefined;
    if (q.id === 'current_crm' && typeof nps === 'number') {
      if (nps >= 9) {
        return 'Wow! Such love for a CRM is unheard of. Would love to know more in subsequent questions.';
      }
      if (nps <= 3) {
        return 'Got it — sounds painful. Let’s first confirm which CRM you’re using.';
      }
      if (nps <= 6) {
        return 'Noted — some friction there. Which CRM are you on right now?';
      }
    }
    return undefined;
  }

  useEffect(() => {
    const saved = localStorage.getItem('survey-progress');
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        setName(obj.name || '');
        setEmail(obj.email || '');
        setCompany(obj.company || '');
        setAnswers(obj.answers || {});
        setRatings(obj.ratings || {});
        setActiveSectionIndex(obj.activeSectionIndex ?? 0);
        setShowIntro(obj.showIntro !== undefined ? !!obj.showIntro : true);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const state = {
      name,
      email,
      company,
      answers,
      ratings,
      activeSectionIndex,
      activeQuestionIndex,
      ratingPage,
      showIntro,
    };
    localStorage.setItem('survey-progress', JSON.stringify(state));
  }, [name, email, company, answers, ratings, activeSectionIndex, activeQuestionIndex, ratingPage, showIntro]);

  // Telemetry helpers
  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('survey-session-id');
    if (!id) {
      id = Math.random().toString(36).slice(2);
      localStorage.setItem('survey-session-id', id);
      // fire session_start
      fetch('/api/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: id, event: 'session_start', name, email }) }).catch(()=>{});
    }
    return id;
  }, [name, email]);

  const viewStartRef = useRef<number>(Date.now());
  useEffect(() => {
    viewStartRef.current = Date.now();
    const section = sections[activeSectionIndex] as Section | RatingGroupSection;
    if ('questions' in section) {
      const q = (section as Section).questions[activeQuestionIndex];
      fetch('/api/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, event: 'question_view', sectionId: (section as unknown as { id: string }).id, questionId: q?.id, stepIndex: activeQuestionIndex }) }).catch(()=>{});
    }
  }, [sections, activeSectionIndex, activeQuestionIndex, sessionId]);

  const activeSection = sections[activeSectionIndex];
  const totalSections = sections.length;

  function setAnswer(id: string, value: unknown) {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  // gist summarization removed from UI

  function getOptionLabel(section: Section['questions'][number], id: string | undefined): string | undefined {
    if (!id) return undefined;
    const opt = (section.options || []).find(o => o.id === id);
    return opt?.label;
  }

  function goTo(nextS: number, nextQ: number, nextR: number) {
    setNavHistory(prev => [...prev, { s: activeSectionIndex, q: activeQuestionIndex, r: ratingPage }]);
    setActiveSectionIndex(nextS);
    setActiveQuestionIndex(nextQ);
    setRatingPage(nextR);
  }

  function buildAck(q: Section['questions'][number], value: unknown): string {
    if (q.type === 'multiple_choice') {
      const label = getOptionLabel(q, String(value || ''));
      return label ? `Got it — ${label}.` : 'Got it.';
    }
    if (q.type === 'scale') {
      return typeof value === 'number' ? `Thanks — noted ${value}.` : 'Thanks.';
    }
    if (q.type === 'multi_select') {
      const selected = Array.isArray(value) ? value.length : 0;
      return selected > 0 ? `Thanks — ${selected} selected.` : 'Thanks.';
    }
    return 'Thanks for the details.';
  }

  async function validateCurrentQuestion(): Promise<boolean> {
    if (!('questions' in activeSection)) return true;
    const q = (activeSection as Section).questions[activeQuestionIndex];
    const val = answers[q.id];

    // Numeric-only question: allow simple numeric input without AI validation
    if (q.id === 'active_users') {
      const num = typeof val === 'string' ? Number(val) : (typeof val === 'number' ? val : NaN);
      if (!Number.isFinite(num) || num < 0) {
        setErrorsByQuestionId(prev => ({ ...prev, [q.id]: ['Enter a valid non‑negative number.'] }));
        return false;
      }
      return true;
    }

    // Skip intent is now LLM-detected (confirm on second Next)

    // Required checks (still required to select something for choice/scale)
    if (q.required) {
      if (q.type === 'multi_select') {
        if (!Array.isArray(val) || val.length === 0) {
          setErrorsByQuestionId(prev => ({ ...prev, [q.id]: ['Please choose at least one.'] }));
          return false;
        }
      } else if (q.type === 'multiple_choice' || q.type === 'scale') {
        if (val === undefined || val === null || val === '') {
          setErrorsByQuestionId(prev => ({ ...prev, [q.id]: ['Please select an option.'] }));
          return false;
        }
      }
    }

    // Open-text checks: allow explicit skip phrases and then defer to LLM
    if (q.type === 'text' || q.type === 'long_text') {
      const text = typeof val === 'string' ? val : '';
      const lower = text.trim().toLowerCase();
      const skipSyn = /^(?:skip|na|n\/a|none|nothing|no\s*comment|not\s*applicable|don'?t\s*know)$/i.test(lower);
      if (skipSyn) {
        if (warnedOnceByQuestionId[q.id]) {
          setErrorsByQuestionId(prev => ({ ...prev, [q.id]: [] }));
          setAckText('No problem — we can skip this one.');
          return true;
        }
        setErrorsByQuestionId(prev => ({ ...prev, [q.id]: ['If you prefer to skip this question, press Next again to confirm.'] }));
        setWarnedOnceByQuestionId(prev => ({ ...prev, [q.id]: true }));
        return false;
      }
      try {
        const res = await fetch('/api/ai/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fieldId: q.id, text, question: q.label, roleId: (answers['primary_role'] as string) || undefined }),
        });
        const data = await res.json();
        const friendly: string | undefined = data.friendly;
        if (data.wantsSkip) {
          if (warnedOnceByQuestionId[q.id]) {
            // confirm skip on second Next
            setAckText('No problem — we can skip this one.');
            return true;
          }
          setErrorsByQuestionId(prev => ({ ...prev, [q.id]: [friendly || 'If you prefer to skip this question, type "skip" or press Next again to confirm.'] }));
          setWarnedOnceByQuestionId(prev => ({ ...prev, [q.id]: true }));
          return false;
        }
        if (data.wantsMore || !data.ok) {
          try {
            const f = await fetch('/api/ai/followup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question: q.label, answer: text }),
            });
            const fj = await f.json();
            const msgs = [friendly || undefined, `Suggestion: ${fj.followup}`].filter(Boolean) as string[];
            setErrorsByQuestionId(prev => ({ ...prev, [q.id]: msgs }));
          } catch {}
          if (warnedOnceByQuestionId[q.id]) {
            return true;
          }
          setErrorsByQuestionId(prev => ({ ...prev, [q.id]: [friendly || ''] }));
          setWarnedOnceByQuestionId(prev => ({ ...prev, [q.id]: true }));
          return false;
        }
      } catch {}
    }

    setAckText(buildAck(q, val));
    return true;
  }

  function skipCurrentQuestion() {
    if (!('questions' in activeSection)) return;
    const q = (activeSection as Section).questions[activeQuestionIndex];
    if (!(q.type === 'text' || q.type === 'long_text')) return;
    setWarnedOnceByQuestionId(prev => ({ ...prev, [q.id]: true }));
    setErrorsByQuestionId(prev => ({ ...prev, [q.id]: [] }));
    setAckText('No problem — we can skip this one.');
    // advance like successful validation
    const isLastSection = activeSectionIndex >= totalSections - 1;
    const moreQuestions = activeQuestionIndex < (activeSection as Section).questions.length - 1;
    if (moreQuestions) {
      goTo(activeSectionIndex, activeQuestionIndex + 1, ratingPage);
      return;
    }
    if (isLastSection) {
      void handleSubmit();
      return;
    }
    goTo(Math.min(totalSections - 1, activeSectionIndex + 1), 0, 0);
  }

  async function handleNext() {
    if (isAdvancing || submitStatus === 'saving') return;
    setIsAdvancing(true);
    const isRatings = 'type' in activeSection && (activeSection as RatingGroupSection).type === 'rating_group';
    const isQuestions = 'questions' in activeSection;
    const isLastSection = activeSectionIndex >= totalSections - 1;

    // rating pagination
    if (isRatings) {
      const rg = activeSection as RatingGroupSection;
      const totalPages = Math.ceil(rg.items.length / 5);
      if (ratingPage < totalPages - 1) {
        goTo(activeSectionIndex, activeQuestionIndex, ratingPage + 1);
        setIsAdvancing(false);
        return;
      }
      // advance to next section
      if (isLastSection) {
        await handleSubmit();
        setIsAdvancing(false);
        return;
      } else {
        goTo(Math.min(totalSections - 1, activeSectionIndex + 1), 0, 0);
        setIsAdvancing(false);
        return;
      }
    }

    // Special table flow: 'invisible_crm' renders all questions at once → advance section in one click
    if (isQuestions && (activeSection as { id: string }).id === 'invisible_crm') {
      if (isLastSection) {
        await handleSubmit();
        setIsAdvancing(false);
        return;
      } else {
        goTo(Math.min(totalSections - 1, activeSectionIndex + 1), 0, 0);
        setIsAdvancing(false);
        return;
      }
    }

    // question progression with validation
    if (isQuestions) {
      const startMs = viewStartRef.current || Date.now();
      const ok = await validateCurrentQuestion();
      if (!ok) { setIsAdvancing(false); return; }
      const moreQuestions = activeQuestionIndex < (activeSection as Section).questions.length - 1;
      if (moreQuestions) {
        const section = activeSection as Section;
        const q = section.questions[activeQuestionIndex];
        const dwellMs = Date.now() - startMs;
        fetch('/api/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, event: 'question_next', sectionId: (activeSection as unknown as { id: string }).id, questionId: q?.id, stepIndex: activeQuestionIndex, msFromStart: dwellMs, extra: { dwellMs } }) }).catch(()=>{});
        goTo(activeSectionIndex, activeQuestionIndex + 1, ratingPage);
        setIsAdvancing(false);
        return;
      }
      // move to next section
      if (isLastSection) {
        await handleSubmit();
        setIsAdvancing(false);
        return;
      } else {
        goTo(Math.min(totalSections - 1, activeSectionIndex + 1), 0, 0);
        setIsAdvancing(false);
        return;
      }
    }
  }

  async function handleSubmit() {
    if (submitStatus === 'saving') return;
    setSubmitStatus('saving');
    // Basic client-side checks so users get clear feedback
    const emailOk = /.+@.+/.test(String(email || ''));
    if (!name || !emailOk) {
      setSubmitStatus('error');
      alert(!name ? 'Please enter your name on the first screen.' : 'Please enter a valid email address on the first screen.');
      return;
    }
    const payload = {
      name,
      email,
      company,
      answers,
      ratingGroup: ratings,
      meta: { channel: 'public' as const },
    };
    const res = await fetch('/api/surveys/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      localStorage.removeItem('survey-progress');
      setSubmitStatus('saved');
      if (json.warning) {
        // transiently show warning, then redirect
        alert(json.warning as string);
      }
      try {
        if (typeof window !== 'undefined' && json?.saved?.id) {
          sessionStorage.setItem('survey-submitted', String(json.saved.id));
        }
      } catch {}
      setTimeout(() => {
        window.location.href = '/thanks';
      }, 500);
    } else {
      try {
        const err = await res.json();
        setSubmitStatus('error');
        alert(typeof err?.error === 'string' ? err.error : 'Submit failed.');
      } catch {
        setSubmitStatus('error');
      }
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-4">
      <header className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center">AI</div>
        <div>
          <div className="font-semibold">Your Guide</div>
          <div className="text-sm text-gray-600">Let’s outsmart the Ugly CRM together.</div>
        </div>
        <div className="ml-auto text-sm text-gray-600">{showIntro ? 0 : computeProgressPercent()}% completed</div>
      </header>

      {showIntro && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">About you</h2>
          <p className="text-sm text-gray-600 mb-3">Quick intro—just this once. Then we’ll dive into your workflow and priorities.</p>
          <div className="grid gap-3">
            <input className="border rounded px-3 py-2" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="Company (optional)" value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <div className="mt-6 flex justify-end">
            <button className="px-4 py-2 rounded bg-black text-white shadow" onClick={() => setShowIntro(false)} type="button">
              Next
            </button>
          </div>
        </section>
      )}

      {!showIntro && activeSectionIndex < totalSections && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold">{activeSection.title}</h2>
          {'objective' in activeSection && (
            <p className="text-sm text-gray-600 mt-1">{activeSection.objective}</p>
          )}
          <div className="mt-4 grid gap-4">
            {'type' in activeSection && (activeSection as RatingGroupSection).type === 'rating_group' && (
              <div className="grid gap-3">
                {(() => {
                  const rg = activeSection as RatingGroupSection;
                  const pageSize = 5;
                  const start = ratingPage * pageSize;
                  const end = Math.min(start + pageSize, rg.items.length);
                  const visible = rg.items.slice(start, end);
                  return (
                    <>
                      {ratingPage === 0 && (
                        <div className="rounded border p-3 bg-gray-50 text-sm text-gray-700 mb-2">
                          We’re moving to the next section: features you value. Please rate each feature from 1–5. Choose 1 if you haven’t heard of it or don’t use it; 5 if it’s mission‑critical.
                        </div>
                      )}
                      {visible.map(item => (
                        <label key={item.id} className="flex items-center gap-3">
                          <div className="w-48" title={('description' in item ? (item as { description?: string }).description : undefined) || undefined}>{item.label}</div>
                          <div className="flex gap-1">
                            {Array.from({ length: (activeSection as RatingGroupSection).scaleMax }).map((_, i) => (
                              <button
                                key={i}
                                className={`h-8 w-8 rounded border ${ratings[item.id] === i + 1 ? 'bg-black text-white' : ''}`}
                                onClick={() => setRatings(prev => ({ ...prev, [item.id]: i + 1 }))}
                                type="button"
                                aria-label={`${item.label} ${i + 1}`}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                        </label>
                      ))}
                      <div className="text-xs text-gray-500 mt-2">Page {ratingPage + 1} of {Math.ceil(rg.items.length / pageSize)}</div>
                    </>
                  );
                })()}
              </div>
            )}
            {'questions' in activeSection && (
              <div className="border rounded p-3">
                {ackText && (
                  <div className="text-sm text-gray-700 italic mb-2">{ackText}</div>
                )}
                {(() => {
                  const currentSection = activeSection as Section;
                  const q = currentSection.questions[activeQuestionIndex] as Section['questions'][number];
                  // If the section is the Invisible CRM block, render all its multiple-choice questions in one table
                  if ((activeSection as { id: string }).id === 'invisible_crm') {
                    const opts: { id: string; label: string }[] = [
                      { id: 'love', label: 'Love it' },
                      { id: 'might', label: 'Might need it' },
                      { id: 'dont_need', label: "Don't need" },
                      { id: 'dont_understand', label: "Don't understand" },
                    ];
                    const rows = (currentSection.questions as Section['questions']).filter(r => r.type === 'multiple_choice');
                    return (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left py-2 pr-4">Feature</th>
                              {opts.map(o => (
                                <th key={o.id} className="text-left py-2 pr-4">{o.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(row => (
                              <tr key={row.id} className="border-t">
                                <td className="py-2 pr-4 align-top">{row.label}</td>
                                {opts.map(o => (
                                  <td key={o.id} className="py-2 pr-4">
                                    <label className="inline-flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={row.id}
                                        checked={answers[row.id] === o.id}
                                        onChange={() => setAnswer(row.id, o.id)}
                                      />
                                    </label>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  if (!q) return null;
                  return (
                    <div>
                      <div className="font-medium flex items-center gap-2 relative">
                        <span title={q.id === 'top_metrics' ? getTopMetricsHint() : undefined}>{q.label}</span>
                        {(q.hint || q.id === 'top_metrics') ? (
                          <span
                            className="h-5 w-5 inline-flex items-center justify-center rounded-full border text-xs bg-white text-gray-700 cursor-help select-none"
                            onMouseEnter={() => setHoverTip({ id: q.id, text: q.id === 'top_metrics' ? getTopMetricsHint() : (q.hint as string) })}
                            onMouseLeave={() => setHoverTip(t => (t?.id === q.id ? null : t))}
                          >
                            i
                          </span>
                        ) : null}
                        {hoverTip?.id === q.id && (
                          <div role="tooltip" className="absolute top-full left-0 mt-1 z-10 rounded border bg-white text-xs p-2 shadow max-w-xs">
                            {hoverTip.text}
                          </div>
                        )}
                      </div>
                      {(() => {
                        const prefix = getContextPrefix(q);
                        return prefix ? (
                          <p className="text-sm text-gray-700 italic mt-1">{prefix}</p>
                        ) : null;
                      })()}
                      {q.explanation && (
                        <p className="text-sm text-gray-600 mt-1">{q.explanation}</p>
                      )}
                      {errorsByQuestionId[q.id] && errorsByQuestionId[q.id].length > 0 && (
                        <div className="mt-2 text-xs text-gray-700 border rounded p-2 bg-gray-50">
                          {errorsByQuestionId[q.id].map((e, idx) => (
                            <div key={idx}>Suggestion: {e}</div>
                          ))}
                        </div>
                      )}
                      {(q.hint || q.id === 'top_metrics') && errorsByQuestionId[q.id] && errorsByQuestionId[q.id].length > 0 && (
                        <div className="mt-2 text-xs text-gray-700 border rounded p-2 bg-gray-50">
                          <div className="font-medium mb-1">Sample:</div>
                          <div>{q.id === 'top_metrics' ? getTopMetricsHint() : q.hint}</div>
                          {q.id === 'top_metrics' && examplesByQuestionId['top_metrics'] && (
                            <ul className="mt-1 list-disc ml-4">
                              {examplesByQuestionId['top_metrics'].map((ex, i) => (
                                <li key={i}>{ex}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      {q.type === 'multiple_choice' && (
                        <div className="mt-2 grid gap-2">
                          {(q.options || []).map(opt => (
                            <label key={opt.id} className="flex items-center gap-2 group">
                              <input
                                type="radio"
                                name={q.id}
                                onChange={() => setAnswer(q.id, opt.id)}
                                checked={answers[q.id] === opt.id}
                              />
                              <span className="relative">
                                {opt.label}
                                {opt.id === 'other' && (
                                  <input
                                    className="ml-2 border rounded px-2 py-1 text-sm"
                                    placeholder="Specify"
                                    value={typeof answers[q.id + '_other'] === 'string' ? (answers[q.id + '_other'] as string) : ''}
                                    onChange={e => setAnswer(q.id + '_other', e.target.value)}
                                  />
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      {q.type === 'scale' && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {Array.from({ length: (q.scaleMax ?? 10) - (q.scaleMin ?? 0) + 1 }).map((_, i) => {
                            const val = (q.scaleMin ?? 0) + i;
                            return (
                              <button
                                key={val}
                                className={`h-8 w-8 rounded border ${answers[q.id] === val ? 'bg-black text-white' : ''}`}
                                onClick={() => setAnswer(q.id, val)}
                                type="button"
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {q.type === 'text' && (
                        <input
                          className="mt-2 border rounded px-3 py-2 w-full"
                          value={(answers[q.id] as string) || ''}
                          onChange={e => setAnswer(q.id, e.target.value)}
                        />
                      )}
                      {q.type === 'multi_select' && (
                        <div className="mt-2 grid gap-2">
                          {(q.options || []).map(opt => {
                            const arr = (answers[q.id] as string[]) || [];
                            const checked = arr.includes(opt.id);
                            return (
                              <label key={opt.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const next = checked
                                      ? arr.filter(v => v !== opt.id)
                                      : [...arr, opt.id];
                                    setAnswer(q.id, next);
                                  }}
                                />
                                <span title={q.id === 'manual_tasks' ? (descriptionsByQuestionId['manual_tasks']?.[opt.label] || undefined) : undefined}>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {q.type === 'long_text' && (
                        <textarea
                          className="mt-2 border rounded px-3 py-2 w-full"
                          rows={4}
                          value={(answers[q.id] as string) || ''}
                          onChange={e => setAnswer(q.id, e.target.value)}
                        />
                      )}
                      {/* Gist is generated for internal use but not shown in the UI */}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-between">
            <button
              className="px-4 py-2 rounded border text-gray-600"
              onClick={() => {
                if (navHistory.length > 0) {
                  const hist = [...navHistory];
                  let last = hist.pop()!;
                  // Skip over skippable questions when going back
                  while (last) {
                    const sec = sections[last.s];
                    if ('questions' in sec && sec.questions[last.q] && shouldSkipQuestion(sec.questions[last.q])) {
                      if (hist.length === 0) break;
                      last = hist.pop()!;
                      continue;
                    }
                    break;
                  }
                  setNavHistory(hist);
                  setActiveSectionIndex(last.s);
                  setActiveQuestionIndex(last.q);
                  setRatingPage(last.r);
                  return;
                }
                if ('type' in activeSection && (activeSection as RatingGroupSection).type === 'rating_group') {
                  if (ratingPage > 0) {
                    setRatingPage(p => p - 1);
                    return;
                  }
                }
                if ('questions' in activeSection && (activeSection as { id: string }).id === 'invisible_crm') {
                  // Table flow: go straight to previous section
                  setActiveSectionIndex(i => Math.max(0, i - 1));
                  setActiveQuestionIndex(0);
                  setRatingPage(0);
                  return;
                }
                if ('questions' in activeSection && activeQuestionIndex > 0) {
                  const sec = activeSection as Section;
                  let prevIdx = activeQuestionIndex - 1;
                  while (prevIdx >= 0 && shouldSkipQuestion(sec.questions[prevIdx])) prevIdx--;
                  if (prevIdx >= 0) {
                    setActiveQuestionIndex(prevIdx);
                    return;
                  }
                }
                if (activeSectionIndex === 0) {
                  setShowIntro(true);
                  return;
                }
                setActiveSectionIndex(i => Math.max(0, i - 1));
              }}
              type="button"
            >
              Back
            </button>
            {(() => {
              const isQuestions = 'questions' in activeSection;
              const moreRatings = false; // handled in handleNext
              const moreQuestions = isQuestions && activeQuestionIndex < (activeSection as Section).questions.length - 1;
              const isLastSection = activeSectionIndex >= totalSections - 1;
              return (
                <div className="flex items-center gap-3">
                  {(() => {
                    if (!isQuestions) return null;
                    const q = (activeSection as Section).questions[activeQuestionIndex];
                    if (q && (q.type === 'text' || q.type === 'long_text')) {
                      return (
                        <button className="px-3 py-2 rounded border text-gray-600" type="button" onClick={skipCurrentQuestion}>
                          Skip
                        </button>
                      );
                    }
                    return null;
                  })()}
                  <button
                    className="px-4 py-2 rounded bg-black text-white shadow disabled:opacity-60"
                    onClick={moreRatings || moreQuestions || !isLastSection ? handleNext : handleSubmit}
                    type="button"
                    disabled={submitStatus === 'saving' || isAdvancing}
                  >
                    {moreRatings || moreQuestions || !isLastSection
                      ? (isAdvancing ? 'Checking…' : 'Next')
                      : submitStatus === 'saving' ? 'Submitting…' : 'Submit'}
                  </button>
                  {submitStatus === 'error' && (
                    <span className="text-sm text-red-600">Couldn’t submit. Please try again.</span>
                  )}
                  {submitStatus === 'saved' && (
                    <span className="text-sm text-green-700">Submitted! Redirecting…</span>
                  )}
                </div>
              );
            })()}
          </div>
          <p className="text-sm text-green-700 mt-3">{activeSection.victoryCopy}</p>
        </section>
      )}

      {activeSectionIndex >= totalSections && (
        <section className="text-center mt-12">
          <h2 className="text-xl font-semibold">Thank you!</h2>
          <p className="text-sm text-gray-600 mt-1">Your answers will help us defeat the Ugly CRM.</p>
        </section>
      )}
    </main>
  );
}


