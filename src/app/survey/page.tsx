"use client";
import { useEffect, useState } from 'react';
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
  const [gists, setGists] = useState<{ [id: string]: { gist: string; hint: string } }>({});
  const sections = surveySchema.sections;

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

  const activeSection = sections[activeSectionIndex];
  const totalSections = sections.length;

  function setAnswer(id: string, value: unknown) {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  async function onBlurSummarize(id: string, text: string) {
    if (!text || text.trim().length < 5) return;
    try {
      const res = await fetch('/api/surveys/gist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setGists(prev => ({ ...prev, [id]: data }));
    } catch {}
  }

  async function handleSubmit() {
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
      localStorage.removeItem('survey-progress');
      window.location.href = '/thanks';
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
                      {visible.map(item => (
                        <label key={item.id} className="flex items-center gap-3">
                          <div className="w-48">{item.label}</div>
                          <div className="flex gap-1">
                            {Array.from({ length: rg.scaleMax }).map((_, i) => (
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
                      <div className="font-medium">{q.label}</div>
                      {q.explanation && (
                        <p className="text-sm text-gray-600 mt-1">{q.explanation}</p>
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
                          onBlur={e => onBlurSummarize(q.id, e.target.value)}
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
                                <span>{opt.label}</span>
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
                          onBlur={e => onBlurSummarize(q.id, e.target.value)}
                        />
                      )}
                      {gists[q.id]?.gist && (
                        <div className="mt-2 text-sm text-gray-700">
                          <div className="font-medium">Gist:</div>
                          <div>{gists[q.id].gist}</div>
                          <div className="text-gray-500 mt-1">{gists[q.id].hint}</div>
                        </div>
                      )}
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
                if ('type' in activeSection && (activeSection as RatingGroupSection).type === 'rating_group') {
                  if (ratingPage > 0) {
                    setRatingPage(p => p - 1);
                    return;
                  }
                }
                if ('questions' in activeSection && activeQuestionIndex > 0) {
                  setActiveQuestionIndex(i => i - 1);
                  return;
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
              const isRatings = 'type' in activeSection && (activeSection as RatingGroupSection).type === 'rating_group';
              const isQuestions = 'questions' in activeSection;
              const moreRatings = isRatings && (() => {
                const rg = activeSection as RatingGroupSection;
                const totalPages = Math.ceil(rg.items.length / 5);
                return ratingPage < totalPages - 1;
              })();
              const moreQuestions = isQuestions && activeQuestionIndex < (activeSection as Section).questions.length - 1;
              const moreInSection = moreRatings || moreQuestions;
              const isLastSection = activeSectionIndex >= totalSections - 1;
              if (moreInSection || !isLastSection) {
                return (
                  <button
                    className="px-4 py-2 rounded bg-black text-white shadow"
                    onClick={() => {
                      if (isRatings && moreRatings) {
                        setRatingPage(p => p + 1);
                      } else if (isQuestions && moreQuestions) {
                        setActiveQuestionIndex(i => i + 1);
                      } else {
                        setActiveSectionIndex(i => Math.min(totalSections - 1, i + 1));
                        setActiveQuestionIndex(0);
                        setRatingPage(0);
                      }
                    }}
                    type="button"
                  >
                    Next
                  </button>
                );
              }
              return (
                <button className="px-4 py-2 rounded bg-black text-white shadow" onClick={handleSubmit} type="button">
                  Submit
                </button>
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


