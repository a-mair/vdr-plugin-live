/* Requirements:
 * see https://www.vdr-portal.de/forum/thread/137309-live-vereinheitlichung-der-best%C3%A4tigungs-popups/?postID=1391352#post1391352
 *
 * - Distinguish between popup after selection of elements and just a button press (where no elements need to be selected
 *   - Reason: Allow to disable popup in case of selection of elements + button is required
 *
 */
#ifndef CONFIRM_H
#define CONFIRM_H

#include <vector>
#include "live.h"
#include "stringhelpers.h"
#include "recman.h"
#include "timers.h"
#include "epgsearch.h"
#include "users.h"

namespace vdrlive {

// note: list of ids must also be available in live/js/live/infowin.js, async function id_from_epgid(epgid)
//(action_id == "del_" || action_id == "pur_" || action_id == "res_" || action_id == "mov_" || action_id == "det_" || action_id == "des_")
//  "del_" delete recording
//  "pur_" permanently delete recording
//  "res_" restore recording
//  "rcd_" recording command
//  "mov_" move recordings
//  "det_" delete timer
//  "des_" delete search timer
//
typedef std::string (*tConfirmationQuestion)(cSv id);
typedef std::vector<std::string> (*tObjectNames)(cSv id);
typedef std::string (*tPerformAction)(cSv id); // return Json, see also std::string simpleJsonReturn(bool success, cSv message)

inline std::vector<std::string> one_object(cSv id) {
  std::vector<std::string> result;
  result.push_back(std::string());
  return result;
}

class cConfirm {
  public:
    const char *m_id;                 // like 'pur_' for 'purge_recording'
    eUserRights m_user_rights;
    const char *m_headline;           // text, headline of popup
    const char *m_warning;            // text, warning in popup (can be nullptr)
    const char *m_prompt;             // text for confirmation button, else headline if nullptr
    const char *m_headline_0;         // text, headline of result if no actions were successful
    const char *m_headline_n;         // text, headline of result if at least one action was successful
    const char *m_headline_error;     // text, headline for "not done" list, because of errors
    tConfirmationQuestion m_question; // function returning confirmation question for popup
    tObjectNames m_objectNames;
    tPerformAction m_perform_action;

    const char *get_headline() const {
      return tr(m_headline);
    }
    std::string get_question(cSv id) const {
      return m_question(id.substr(4));
    }
    std::vector<std::string> get_object_names(cSv id) const {
      return m_objectNames(id.substr(4));
    }
    std::string get_prompt() const {
      return tr(m_prompt && *m_prompt ? m_prompt : m_headline);
    }
    std::string perform_action(cSv id) const {
      return m_perform_action(id.substr(4) );
    }
    bool currentUserHasRight() const {
      return cUser::CurrentUserHasRightTo(m_user_rights);
    }
};

inline bool operator< (const cConfirm &c1, const cConfirm &c2) { return cSv(c1.m_id) <  cSv(c2.m_id); }
inline bool operator< (const cConfirm &c1, cSv c2)             { return cSv(c1.m_id) <  c2; }
inline bool operator< (cSv c1            , const cConfirm &c2) { return     c1       <  cSv(c2.m_id); }
inline bool operator==(const cConfirm &c1, const cConfirm &c2) { return cSv(c1.m_id) == cSv(c2.m_id); }

inline static const cSortedVector<cConfirm, std::less<>> g_confirm_popups =
{
  { "del_", m_user_rights:    UR_DELRECS,
            m_headline:       trNOOP("Delete recording"),
            m_warning:        nullptr,
            m_prompt:         trNOOP("Delete"),
            m_headline_0:     trNOOP("No recordings deleted"),
            m_headline_n:     trNOOP("Deleted recordings:"),
            m_headline_error: trNOOP("Error deleting recordings:"),
            m_question:       &RecordingsManager_DeleteConfirmationQuestion,
            m_objectNames:    &RecordingsManager_object_names,
            m_perform_action: &RecordingsManager_DeleteRecording
  },
  { "res_", m_user_rights:    UR_DELRECS,
            m_headline:       trNOOP("Restore recording"),
            m_warning:        nullptr,
            m_prompt:         trNOOP("Restore"),
            m_headline_0:     trNOOP("No recordings restored"),
            m_headline_n:     trNOOP("Restored recordings:"),
            m_headline_error: trNOOP("Error restoring recordings:"),
            m_question:       &RecordingsManager_RestoreConfirmationQuestion,
            m_objectNames:    &RecordingsManager_object_names,
            m_perform_action: &RecordingsManager_RestoreRecording
  },
  { "pur_", m_user_rights:    UR_DELRECS,
            m_headline:       trNOOP("Permanently delete recording"),
            m_warning:        trNOOP("Warning: This cannot be undone!"),
            m_prompt:         trNOOP("Delete permanently"),
            m_headline_0:     trNOOP("No recordings deleted permanently"),
            m_headline_n:     trNOOP("Permanently deleted recordings:"),
            m_headline_error: trNOOP("Error permanently deleting recordings:"),
            m_question:       &RecordingsManager_PurgeConfirmationQuestion,
            m_objectNames:    &RecordingsManager_object_names,
            m_perform_action: &RecordingsManager_PurgeRecording
  },
  { "mov_", m_user_rights:    UR_EDITRECS,
            m_headline:       trNOOP("Move recordings"),
            m_warning:        nullptr,
            m_prompt:         trNOOP("Move"),
            m_headline_0:     trNOOP("No recordings moved"),
            m_headline_n:     trNOOP("Moved recordings:"),
            m_headline_error: trNOOP("Error moving recordings:"),
            m_question:       &RecordingsManager_MoveConfirmationQuestion,
            m_objectNames:    &RecordingsManager_object_names_mov,
            m_perform_action: &RecordingsManager_MoveRecording
  },
  { "rcd_", m_user_rights:    UR_EDITRECS,
            m_headline:       trNOOP("Recording commands"),
            m_warning:        nullptr,
            m_prompt:         trNOOP("Execute"),
            m_headline_0:     trNOOP("Command not executed on any recording"),
            m_headline_n:     "",
            m_headline_error: trNOOP("Error executing command on the following recordings:"),
            m_question:       &RecordingsManager_CommandConfirmationQuestion,
            m_objectNames:    &RecordingsManager_object_names_mov,
            m_perform_action: &RecordingsManager_CommandRecording
  },
  { "det_", m_user_rights:    UR_DELTIMERS,
            m_headline:       trNOOP("Delete timer"),
            m_warning:        nullptr,
            m_prompt:         trNOOP("Delete"),
            m_headline_0:     trNOOP("No timers deleted"),
            m_headline_n:     trNOOP("Deleted timers:"),
            m_headline_error: trNOOP("Error deleting timers:"),
            m_question:       &TimerManager_DeleteConfirmationQuestion,
            m_objectNames:    &one_object,
            m_perform_action: &TimerManager_DeleteTimer
  },
  { "des_", m_user_rights:    UR_DELSTIMERS,
            m_headline:       trNOOP("Delete search timer"),
            m_warning:        nullptr,
            m_prompt:         trNOOP("Delete"),
            m_headline_0:     trNOOP("No search timers deleted"),
            m_headline_n:     trNOOP("Deleted search timers:"),
            m_headline_error: trNOOP("Error deleting search timers:"),
            m_question:       &SearchTimers_DeleteConfirmationQuestion,
            m_objectNames:    &one_object,
            m_perform_action: &SearchTimers_DeleteSearchTimer
  }
};

inline const cConfirm *get_confirm_popup(cSv id) {
  auto r = g_confirm_popups.find(id.substr(0,4));
  if (r != g_confirm_popups.end()) return &(*r);
  return nullptr;
}

template <size_t N>
inline cToSvConcat<N>& AppendTag(cToSvConcat<N>& target, cSv tag, cSv value) {
// "<$tag$>": "<$value$>"
  target.appendStringEscapedAndCorrectNonUTF8(tag) << ": ";
  target.appendStringEscapedAndCorrectNonUTF8(value);
  return target;
}
template <size_t N>
inline cToSvConcat<N>& AppendTag(cToSvConcat<N>& target, cSv tag, int value) {
// "<$tag$>": <$value$>
  target.appendStringEscapedAndCorrectNonUTF8(tag) << ": " << value;
  return target;
}
template <size_t N>
inline cToSvConcat<N>& AppendTagB(cToSvConcat<N>& target, cSv tag, bool value) {
// "<$tag$>": "<$value$>"
  target.appendStringEscapedAndCorrectNonUTF8(tag) << ": " << (value?"true":"false");
  return target;
}

template <size_t N>
inline cToSvConcat<N>& AppendId(cToSvConcat<N>& result, cSv name_id, cSv id) {
  result << "{\n";
  AppendTag(result, name_id, id) << ",\n";
  return result;
}
template <size_t N>
inline cToSvConcat<N>& AppendSuccessMessage(cToSvConcat<N>& result, bool success, cSv message) {
  AppendTagB(result, "success", success);
  if (!message.empty() ) {
    result << ",\n";
    AppendTag(result, "message", message);
  }
  result << "\n}";
  return result;
}
template <size_t N>
inline cToSvConcat<N>& AppendNameSuccessMessage(cToSvConcat<N>& result, cSv name, bool success, cSv message = cSv() ) {
  AppendTag(result, "name", name) << ",\n";
  AppendSuccessMessage(result, success, message);
  return result;
}

template <size_t N>
inline cToSvConcat<N>& AppendObjectNotFound(cToSvConcat<N>& result, cSv id, const char* message) {
  cToSvFormatted message_f(message, cToSvConcat(id).c_str() );
  AppendNameSuccessMessage(result, message_f, false);
  return result;
}
inline std::string simpleJsonReturn(bool success, cSv message) {
//{
//  "success": <$success?"true":"false"$>,
//  "message": <$ cToSvStringEscapedAndCorrectNonUTF8(message) $>
//}
  cToSvConcat result("{\n  ");
  AppendTagB(result, "success", success) << ",\n  ";
  AppendTag(result, "message", message) << ",\n  ";
  AppendTag(result, "num_changed_objects", success?1:0) << "\n}";
  return std::string(result);
}

} // namespace live
#endif
