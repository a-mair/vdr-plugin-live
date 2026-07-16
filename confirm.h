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
//  "crt_" create timer
//  "act_" activate timer
//  "dat_" deactivate timer
//  "des_" delete search timer
//  "acs_" activate search timer
//  "das_" deactivate search timer
//
typedef std::string (*tConfirmationQuestion)(cSv id);
typedef std::vector<std::string> (*tObjectNames)(cSv id);
typedef std::string (*tPerformAction)(cSv id); // return Json, see below for required Json format

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
    bool confirmationSupported() const {
      return m_question != nullptr;
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
  { "crt_", m_user_rights:    UR_EDITTIMERS,
            m_headline:       nullptr,
            m_warning:        nullptr,
            m_prompt:         nullptr,
            m_headline_0:     trNOOP("No timers created"),
            m_headline_n:     trNOOP("Created timers:"),
            m_headline_error: trNOOP("Error creating timers:"),
            m_question:       nullptr,
            m_objectNames:    &one_object,
            m_perform_action: &TimerManager_CreateTimer
  },
  { "act_", m_user_rights:    UR_EDITTIMERS,
            m_headline:       nullptr,
            m_warning:        nullptr,
            m_prompt:         nullptr,
            m_headline_0:     trNOOP("No timers activated"),
            m_headline_n:     trNOOP("Activated timers:"),
            m_headline_error: trNOOP("Error activating timers:"),
            m_question:       nullptr,
            m_objectNames:    &one_object,
            m_perform_action: &TimerManager_ActivateTimer
  },
  { "dat_", m_user_rights:    UR_EDITTIMERS,
            m_headline:       nullptr,
            m_warning:        nullptr,
            m_prompt:         nullptr,
            m_headline_0:     trNOOP("No timers deactivated"),
            m_headline_n:     trNOOP("Deactivated timers:"),
            m_headline_error: trNOOP("Error deactivating timers:"),
            m_question:       nullptr,
            m_objectNames:    &one_object,
            m_perform_action: &TimerManager_DeactivateTimer
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
  },
  { "acs_", m_user_rights:    UR_EDITSTIMERS,
            m_headline:       nullptr,
            m_warning:        nullptr,
            m_prompt:         nullptr,
            m_headline_0:     trNOOP("No search timers activated"),
            m_headline_n:     trNOOP("Activated search timers:"),
            m_headline_error: trNOOP("Error activating search timers:"),
            m_question:       nullptr,
            m_objectNames:    &one_object,
            m_perform_action: &SearchTimers_ActivateTimer
  },
  { "das_", m_user_rights:    UR_EDITSTIMERS,
            m_headline:       nullptr,
            m_warning:        nullptr,
            m_prompt:         nullptr,
            m_headline_0:     trNOOP("No search timers deactivated"),
            m_headline_n:     trNOOP("Deactivated search timers:"),
            m_headline_error: trNOOP("Error deactivating search timers:"),
            m_question:       nullptr,
            m_objectNames:    &one_object,
            m_perform_action: &SearchTimers_DeactivateTimer
  }
};

inline const cConfirm *get_confirm_popup(cSv id) {
  auto r = g_confirm_popups.find(id.substr(0,4));
  if (r != g_confirm_popups.end()) return &(*r);
  return nullptr;
}

/*
  Json structure which must be returned by function "tPerformAction m_perform_action"
  Note: additional tags may be added for specific actions
{
  "action" : 3 chars action id. Required. See top of this file for action ids.
             Note: This is added by pages/action.ecpp,
             implementations of "tPerformAction m_perform_action" must not add this tag
  "success": boolean,    // required
     false In case of errors preventing the system to process any object.
           Such errors include missing permission, bug, connection issues, ...
           In this case, "message" is required. The other tags are ignored.
     true  Otherwise. In this case, "message" is ignored but "objects" is required.
           There might still be errors while processing the objects.
           These errors are reported in the "objects" array.
  "message": required if "success" == false, otherwise ignored
  "reload_required": bool. Required.
             true if the page must be reloaded because of outdated data
             or because an object was changed
  "objects": array. Required if "success" == true, otherwise ignored
             even if the "objects" array is required, the array may be empty
             if no objects are selected for processing
             -> there must be one array element for each object selected for processing
  [
    {
      "id"     : object id,   // required
      "name"   : Name of object, as known by the user. Required.
                 If object was not found, here is the object not found message
      "success": boolean,   // required
      "message": ignored if "success" == true for this object, otherwise optional
    },
    { ...}
  ]
}

The following functions can help to create this Json structure
*/
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
inline cToSvConcat<N>& JsonOpen(cToSvConcat<N>& result) {
/*
{
  "success": true,
  "objects":
  [
*/
  result << "{\n";
  AppendTagB(result, "success", true) << ",\n\"objects\": [";
  return result;
}
template <size_t N>
inline cToSvConcat<N>& JsonOpen(cToSvConcat<N>& result, cSv tag, cSv value) {
/*
{
  "success": true,
  "<$tag$>": "<$value$>",
  "objects":
  [
*/
  result << "{\n";
  AppendTagB(result, "success", true) << ",\n";
  AppendTag(result, tag, value) << ",\n\"objects\": [";
  return result;
}
template <size_t N>
inline cToSvConcat<N>& JsonAppendObject(cToSvConcat<N>& result, cSv id, cSv name, bool success, cSv message = cSv() ) {
/*
, (add a comma here if required)
{
  "id"     : "<$id$>",
  "name"   : "<$name$>",
  "success": <$success$>,
  "message": "<$message$>"  (if !message.empty() )
}
*/
  if (result.length() < 1) esyslog3("JsonAppendObject called before JsonOpen, result = ", result);
  else if (result[result.length() - 1] != '[') result << ',';

  result << "\n{\n";
  AppendTag(result, "id", id) << ",\n";
  AppendTag(result, "name", name) << ",\n";
  AppendTagB(result, "success", success);
  if (!message.empty() ) {
    result << ",\n";
    AppendTag(result, "message", message);
  }
  result << "\n}";
  return result;
}
template <size_t N>
inline cToSvConcat<N>& JsonAppendObjectNotFound(cToSvConcat<N>& result, cSv id, const char* message) {
/*
, (add a comma here if required)
{
  "id"     : "<$id$>",
  "name"   : "<$printf(message, id)$>", (message indicating that the object with this id was not found)
  "success": false
}
*/
  cToSvFormatted message_f(message, cToSvConcat(id).c_str() );
  JsonAppendObject(result, id, message_f, false);
  return result;
}
template <size_t N>
inline std::string JsonClose(cToSvConcat<N>& result, bool reload_required = true) {
/*
  ],
  "reload_required": <$reload_required$>
}
*/
  result << "],\n";
  AppendTagB(result, "reload_required", reload_required) << "\n}";
  return std::string(result);
}

// ================================================================
// === create complete Json result with one metod =================
// ================================================================
inline std::string JsonReturnError(cSv message) {
//{
//  "success": false,
//  "message": <$ cToSvStringEscapedAndCorrectNonUTF8(message) $>,
//  "reload_required": false
//}
  cToSvConcat result("{\n  ");
  AppendTagB(result, "success", false) << ",\n  ";
  AppendTag(result, "message", message) << ",\n  ";
  AppendTagB(result, "reload_required", false) << "\n}";
  return std::string(result);
}

// === if you have exactly one object, these methods create the complete
//     Json result for you
inline std::string JsonReturnOneObjectNotFound(cSv id, const char* message) {
/*
{
  "success": true,
  "objects":
  [
    {
      "id"     : "<$id$>",
      "name"   : "<$message$>",   // like timer with id ... not found
      "success": false,
    }
  ],
  "reload_required": true
}
*/
  cToSvConcat result;
  JsonOpen(result);
  JsonAppendObjectNotFound(result, id, message);
  return JsonClose(result, true);
}
inline std::string JsonReturnOneObject(cSv id, cSv name, bool success, bool reload_required = true, cSv message = cSv() ) {
/*
{
  "success": true,
  "objects":
  [
    {
      "id"     : "<$id$>",
      "name"   : "<$name$>",
      "success": <$success$>,
      "message": "<$message$>"  (if !message.empty() )
    }
  ],
  "reload_required": <$reload_required$>
}
*/
  cToSvConcat result;
  JsonOpen(result);
  JsonAppendObject(result, id, name, success, message);
  return JsonClose(result, reload_required);
}
} // namespace live
#endif
