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
    const char *m_id; // like pur_  for purge_recording
    eUserRights m_user_rights;
    const char *m_headline;  // text, headline of popup
    const char *m_warning;   // text, warning in popup (can be nullptr)
    const char *m_prompt;    // text for confirmation button, headline if nullptr)
    tConfirmationQuestion m_confirmation_question;
    tObjectNames m_objectNames;
    tPerformAction m_perform_action;

    const char *get_headline() const {
      return tr(m_headline);
    }
    std::string get_question(cSv id) const {
      return m_confirmation_question(id.substr(4));
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
  { "del_", UR_DELRECS, trNOOP("Delete recording"), nullptr, trNOOP("Delete"), &RecordingsManager_DeleteConfirmationQuestion, &RecordingsManager_object_names, &RecordingsManager_DeleteRecording},
  { "res_", UR_DELRECS, trNOOP("Restore recording"), nullptr, trNOOP("Restore"), &RecordingsManager_RestoreConfirmationQuestion, &RecordingsManager_object_names, &RecordingsManager_RestoreRecording},
  { "pur_", UR_DELRECS, trNOOP("Permanently delete recording"), trNOOP("Warning: This cannot be undone!"), trNOOP("Delete permanently"), &RecordingsManager_PurgeConfirmationQuestion, &RecordingsManager_object_names, &RecordingsManager_PurgeRecording},
  { "mov_", UR_EDITRECS, trNOOP("Move recordings"), nullptr, trNOOP("Move"), &RecordingsManager_MoveConfirmationQuestion, &RecordingsManager_object_names_mov, &RecordingsManager_MoveRecording},
  { "rcd_", UR_EDITRECS, trNOOP("Recording commands"), nullptr, trNOOP("Execute"), &RecordingsManager_CommandConfirmationQuestion, &RecordingsManager_object_names_mov, &RecordingsManager_CommandRecording},
  { "det_", UR_DELTIMERS, trNOOP("Delete timer"), nullptr, trNOOP("Delete"), &TimerManager_DeleteConfirmationQuestion, &one_object, &TimerManager_DeleteTimer},
  { "des_", UR_DELSTIMERS, trNOOP("Delete search timer"), nullptr, trNOOP("Delete"), &SearchTimers_DeleteConfirmationQuestion, &one_object, &SearchTimers_DeleteSearchTimer}

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
inline cToSvConcat<N>& AppendTagB(cToSvConcat<N>& target, cSv tag, bool value) {
// "<$tag$>": "<$value$>"
  target.appendStringEscapedAndCorrectNonUTF8(tag) << ": " << (value?"true":"false");
  return target;
}

inline std::string simpleJsonReturn(bool success, cSv message) {
//{
//  "success": <$success?"true":"false"$>,
//  "message": <$ cToSvStringEscapedAndCorrectNonUTF8(message) $>
//}
  cToSvConcat result("{\n  ");
  AppendTagB(result, "success", success) << ",\n  ";
  AppendTag(result, "message", message) << "\n}";
  return std::string(result);
}

} // namespace live
#endif
