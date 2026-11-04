import React, { useState } from 'react';
import { Gear, Bell, Envelope, User, ShieldCheck, Check } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

export const ClassroomSettingsPage: React.FC = () => {
  const { isDark, currentUser } = useApp();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [commentsOnPosts, setCommentsOnPosts] = useState(true);
  const [privateCommentsAlerts, setPrivateCommentsAlerts] = useState(true);
  const [workReturnedAlerts, setWorkReturnedAlerts] = useState(true);
  const [dueReminders, setDueReminders] = useState(true);
  const [lateSubmissions, setLateSubmissions] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-black/10 dark:border-white/10">
        <div className="w-10 h-10 rounded-2xl bg-[#059669]/10 text-[#059669] dark:text-[#69DB7C] flex items-center justify-center">
          <Gear size={22} />
        </div>
        <div>
          <h1 className="text-xl font-medium tracking-tight">Classroom Settings</h1>
          <p className="text-xs text-black/60 dark:text-white/60">
            Account preferences, notification alerts, and class defaults
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Summary Card */}
        <div
          className={`p-6 rounded-3xl border space-y-4 ${
            isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
            <User size={16} />
            <span>Profile Information</span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-mono font-medium ${
                isDark ? 'bg-[#69DB7C]/20 text-[#69DB7C]' : 'bg-[#ECFDF5] text-[#059669]'
              }`}
            >
              {currentUser?.avatarTag || 'CU'}
            </div>
            <div>
              <div className="font-medium text-base">{currentUser?.name || 'Guest User'}</div>
              <div className="text-xs font-mono opacity-60">{currentUser?.email || 'N/A'}</div>
              <div className="text-[11px] font-mono text-[#059669] dark:text-[#69DB7C] capitalize mt-0.5">
                Role: {currentUser?.role || 'Student'} • ID: {currentUser?.matricOrStaffId || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Card */}
        <div
          className={`p-6 rounded-3xl border space-y-5 ${
            isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
            <Bell size={16} />
            <span>Notification Preferences</span>
          </div>

          <div className="space-y-4 divide-y divide-black/5 dark:divide-white/5 text-sm">
            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <div className="font-medium text-xs">Email Notifications</div>
                <div className="text-[11px] opacity-60">
                  Receive summary emails when classwork or announcements are posted
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#059669]"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <div className="font-medium text-xs">Comments on your announcements</div>
                <div className="text-[11px] opacity-60">Notify when someone replies to your post</div>
              </div>
              <input
                type="checkbox"
                checked={commentsOnPosts}
                onChange={(e) => setCommentsOnPosts(e.target.checked)}
                className="w-4 h-4 accent-[#059669]"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <div className="font-medium text-xs">Private comments on work</div>
                <div className="text-[11px] opacity-60">Notify when private feedback is sent or received</div>
              </div>
              <input
                type="checkbox"
                checked={privateCommentsAlerts}
                onChange={(e) => setPrivateCommentsAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#059669]"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <div className="font-medium text-xs">Work returned and grades</div>
                <div className="text-[11px] opacity-60">Notify when assignments are scored and returned</div>
              </div>
              <input
                type="checkbox"
                checked={workReturnedAlerts}
                onChange={(e) => setWorkReturnedAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#059669]"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <div className="font-medium text-xs">Due-date reminders</div>
                <div className="text-[11px] opacity-60">Receive alerts 24 hours prior to assignment deadlines</div>
              </div>
              <input
                type="checkbox"
                checked={dueReminders}
                onChange={(e) => setDueReminders(e.target.checked)}
                className="w-4 h-4 accent-[#059669]"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <div className="font-medium text-xs">Late student submissions</div>
                <div className="text-[11px] opacity-60">Alert instructors when students turn in work late</div>
              </div>
              <input
                type="checkbox"
                checked={lateSubmissions}
                onChange={(e) => setLateSubmissions(e.target.checked)}
                className="w-4 h-4 accent-[#059669]"
              />
            </label>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
              <Check size={16} />
              <span>Settings saved</span>
            </span>
          )}
          <button
            type="submit"
            className="btn-google px-6 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClassroomSettingsPage;

