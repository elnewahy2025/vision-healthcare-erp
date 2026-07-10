import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Star, Send, Heart, MessageSquare } from 'lucide-react';

interface Survey { id: string; name: string; type: string; questions: Array<{id: string; text: string; type: 'rating' | 'text' | 'choice'; options?: string[]; required: boolean}>; }

export default function PostVisitSurveyPage() {
  const [step, setStep] = useState<'intro' | 'questions' | 'thankyou'>('intro');
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const slug = new URLSearchParams(window.location.search).get('tenant') || 'demo';
        const res = await api.get('/surveys/active');
        const active = res.data.data?.[0];
        if (active) setSurvey(active);
      } catch { /* no survey */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const slug = new URLSearchParams(window.location.search).get('tenant') || 'demo';
      await api.post(`/surveys/${survey!.id}/respond`, {
        tenantSlug: slug,
        responses: answers,
        patientComment: comment || undefined,
      });
      setStep('thankyou');
    } catch { toast.error('Submission failed. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const renderStars = (qId: string) => {
    const val = answers[qId] || 0;
    return (
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} onClick={() => setAnswers(p => ({ ...p, [qId]: star }))}
            className="min-w-[48px] min-h-[48px] focus:outline-none transition-transform hover:scale-110">
            <Star className={`w-10 h-10 ${star <= val ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <Heart className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">How was your visit?</h1>
          <p className="text-gray-500 mb-8">Your feedback helps us improve our care. It only takes 1 minute!</p>
          <button onClick={() => setStep('questions')} className="bg-blue-600 text-white w-full py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors min-h-[56px]">
            Start Feedback
          </button>
          <p className="text-xs text-gray-400 mt-4">Your responses are anonymous</p>
        </div>
      </div>
    );
  }

  if (step === 'thankyou') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
          <p className="text-gray-500 mb-6">Your feedback has been submitted. We appreciate your time!</p>
          <button onClick={() => window.close()} className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors min-h-[48px]">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h1 className="text-2xl font-bold mb-2">{survey?.name || 'Visit Feedback'}</h1>
          <p className="text-gray-500 mb-6">Please rate your experience</p>

          <div className="space-y-8">
            {survey?.questions?.map(q => (
              <div key={q.id}>
                <p className="font-medium mb-3 text-lg text-center">{q.text}</p>
                {q.type === 'rating' && renderStars(q.id)}
                {q.type === 'text' && (
                  <textarea className="w-full border rounded-xl p-4 h-28 text-base"
                    placeholder="Your feedback..." value={answers[q.id] || ''}
                    onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} />
                )}
                {q.type === 'choice' && q.options && (
                  <div className="space-y-2">
                    {q.options.map(opt => (
                      <button key={opt} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-colors min-h-[48px] ${answers[q.id] === opt ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div>
              <p className="font-medium mb-2" style={{ fontSize: '16px' }}>Additional Comments</p>
              <textarea className="w-full border rounded-xl p-4 h-24 text-base" style={{ fontSize: '16px' }}
                placeholder="Tell us more about your experience..." value={comment} onChange={e => setComment(e.target.value)}
              />
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              className="bg-blue-600 text-white w-full py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[56px] flex items-center justify-center gap-2">
              {submitting ? 'Submitting...' : <><MessageSquare className="w-5 h-5" /> Submit Feedback</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
