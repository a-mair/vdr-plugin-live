#include "timers.h"
#include "timerconflict.h"

#include "exception.h"
#include "tools.h"
#include "confirm.h"

// STL headers need to be before VDR tools.h (included by <vdr/plugin.h>)
#include <sstream>
#include <memory>

#include <vdr/plugin.h>
#include <vdr/menu.h>
#include <vdr/svdrp.h>
#include "services.h"
#include "setup.h"
#include "epg_events.h"

namespace vdrlive {

  int TimerManager::ExecSVDRPCommandReportErrors(cStr ServerName, const char *Command, cSv context) {
// like ExecSVDRPCommand, but report errors in syslog, together with context
// Return codes:
// 0 success
// 1 error calling ExecSVDRPCommand
// 2 error code != 250 returned by ExecSVDRPCommand
// 3 no ServerName provided
    if (ServerName.empty()) {
      esyslog3("no ServerName provided ", context, "', svdrp command '", Command, "'");
      return 3;
    }
    dsyslog2(context, " server '", ServerName, "', svdrp command '", Command, "'");
    cStringList response;
    if (!ExecSVDRPCommand(ServerName, Command, &response)) {
      esyslog2(context, " server '", ServerName, "', svdrp command '", Command, "' failed");
      return 1;
    }
    int ret = 0;
    for (int i = 0; i < response.Size(); i++) {
      int code = SVDRPCode(response[i]);
      if (code != 250) {
        esyslog2(context, " server '", ServerName, "', svdrp command '", Command, "' failed. Response: '", response[i], "'");
        ret = 2;
      }
    }
    if (ret == 2) throw HtmlError(tr("Error in timer settings") );
    return ret;
  }
  const cTimer* SortedTimers::GetByTimerId(cSv timerid, const cTimers* Timers)
  {
    cSplit parts(timerid, ':');
    if (parts.size() < 5) {
      esyslog("live: GetByTimerId: invalid format %.*s", (int)timerid.length(), timerid.data() );
      return nullptr;
    }

#ifdef DEBUG_LOCK
    dsyslog("live: timers.cpp SortedTimers::GetByTimerId() LOCK_CHANNELS_READ");
#endif
    LOCK_CHANNELS_READ;
    auto part = parts.begin();
    const cChannel* channel = Channels->GetByChannelID(lexical_cast<tChannelID>(*part, tChannelID(), "SortedTimers::GetByTimerId"));
    if (!channel) {
      esyslog("live: GetByTimerId: no channel %.*s", (int)(*part).length(), (*part).data() );
      return nullptr;
    }

    int weekdays = parse_int<int>(*++part);
    time_t day = parse_int<time_t>(*++part);
    int start = parse_int<int>(*++part);
    int stop = parse_int<int>(*++part);

    for (const cTimer* timer = Timers->First(); timer; timer = Timers->Next(timer)) {
      if ( timer->Channel() == channel &&
         ( ( weekdays != 0 && timer->WeekDays() == weekdays ) || ( weekdays == 0 && timer->Day() == day ) ) &&
         timer->Start() == start && timer->Stop() == stop )
        return timer;
    }
    return nullptr;
  }

  std::string SortedTimers::GetTimerId(cTimer const& timer)
  {
    return std::string(cToSvConcat(timer.Channel()->GetChannelID(), ':', timer.WeekDays(), ':', timer.Day(), ':', timer.Start(), ':', timer.Stop()) );
  }

  std::string SortedTimers::EncodeDomId(cSv timerid)
  {
    cToSvConcat tId("timer_");
    size_t enc_begin = tId.length();
    tId.append(timerid);
    vdrlive::EncodeDomId(tId.begin() + enc_begin, tId.end(), ".-:", "pmc");
    return std::string(tId);
  }
  std::string SortedTimers::GetEncodedTimerId(cTimer const& timer)
  {
    cToSvConcat tId("timer_");
    size_t enc_begin = tId.length();
    tId.concat(timer.Channel()->GetChannelID(), ':', timer.WeekDays(), ':', timer.Day(), ':', timer.Start(), ':', timer.Stop());
    vdrlive::EncodeDomId(tId.begin() + enc_begin, tId.end(), ".-:", "pmc");
    return std::string(tId);
  }

  std::string SortedTimers::DecodeDomId(cSv timerDomId)
  {
    cSv timerStr("timer_");
    cToSvConcat tId(timerDomId.substr(timerStr.length()));
    vdrlive::DecodeDomId(tId.begin(), tId.end(), "pmc", ".-:");
    return std::string(tId);
  }

  std::string SortedTimers::GetTimerDays(cTimer const *timer)
  {
    if (!timer) return "";
    std::string currentDay = timer->WeekDays() > 0 ?
      *cTimer::PrintDay(0, timer->WeekDays(), false) :
      std::string(cToSvDateTime(tr("%A, %x"), timer->Day()));
    return currentDay;
  }

  std::string SortedTimers::GetTimerInfo(cTimer const& timer)
  {
    cToSvConcat info;
    info << trVDR("Priority") << ": " << timer.Priority() << "\n";
    info << trVDR("Lifetime") << ": " << timer.Lifetime() << "\n";
    info << trVDR("VPS") << ": " << (timer.HasFlags(tfVps)?trVDR("yes"):trVDR("no")) << "\n";

    if (timer.Aux())
    {
      cSv epgsearchinfo = partInXmlTag(timer.Aux(), "epgsearch");
      if (!epgsearchinfo.empty())
      {
        cSv searchtimer = partInXmlTag(epgsearchinfo, "searchtimer");
        if (!searchtimer.empty())
          info << tr("Search timer") << ": " << searchtimer << "\n";
      }
    }
    if (!timer.Local()) {
      info << trVDR("Record on") << ": " << timer.Remote() << "\n";
    }
    return std::string(info);
  }

  std::string SortedTimers::TvScraperTimerInfo(cTimer const& timer, std::string &recID, std::string &recName) {
    if (!timer.Aux()) return "";
    cGetAutoTimerReason getAutoTimerReason;
    getAutoTimerReason.timer = &timer;
    getAutoTimerReason.requestRecording = true;
    {
      LOCK_RECORDINGS_READ;
      if (getAutoTimerReason.call(LiveSetup().GetPluginTvscraper()) ) {
        if (!getAutoTimerReason.createdByTvscraper) return "";
        if (getAutoTimerReason.recording) {
          recID = concat("recording_", cToSvXxHash128(cSv(getAutoTimerReason.recording->FileName(), strlen(getAutoTimerReason.recording->FileName())-4) ));
          recName = std::move(getAutoTimerReason.recordingName);
          utf8_sanitize_string(recName);
          return std::move(getAutoTimerReason.reason);
        }
        return concat(getAutoTimerReason.reason, " ", getAutoTimerReason.recordingName);
      }
    }
// fallback information, if this Tvscraper method is not available
    cSv tvScraperInfo = partInXmlTag(timer.Aux(), "tvscraper");
    if (tvScraperInfo.empty()) return "";
    cSv data = partInXmlTag(tvScraperInfo, "reason");
    if (data.empty() ) return "";
    return concat(data, " ", partInXmlTag(tvScraperInfo, "causedBy"));
  }

  void TimerManager::UpdateTimer(int timerId, cStr remote, cStr oldRemote, cStr builder)
  {
    if (timerId == 0 ) {
// new timer
      CreateTimer(remote, builder);
      return;
    }
// timer exists
    if (remote != oldRemote) {
      isyslog3("move timer from server '", oldRemote.empty()?"local":oldRemote, "' to server '", remote.empty()?"local":remote, "'");
      DeleteTimer(timerId, oldRemote);
      CreateTimer(remote, builder);
      return;
    }
// timer stays on same server
    if (!remote.empty() ) {
      cToSvConcat command("MODT ", timerId, " ", builder);
      int svdrpOK = ExecSVDRPCommandReportErrors(remote, command.c_str(), "UpdateTimer()");
      if (svdrpOK == 0) isyslog("live: remote timer '%s' on server '%s' updated", command.c_str(), remote.c_str() );
      return;
    }
// change local timer
#ifdef DEBUG_LOCK
    dsyslog3("LOCK_TIMERS_WRITE");
#endif
    LOCK_TIMERS_WRITE;
    Timers->SetExplicitModify();
    cTimer* oldTimer = Timers->GetById(timerId, oldRemote.vdr_str() );
    dsyslog("live: UpdateTimer() change local timer '%s'", *oldTimer->ToDescr());
    if (oldTimer == 0) {
      esyslog3(tr("Timer not defined"));
      throw HtmlError(tr("Timer not defined") );
      return;
    }

    cTimer copy = *oldTimer;
    dsyslog("live: old timer flags: %u", copy.Flags());
    if ( !copy.Parse( builder.c_str() ) ) {
      esyslog3(tr("Error in timer settings"));
      throw HtmlError(tr("Error in timer settings") );
      return;
    }
    if (oldTimer->HasFlags(tfRecording)) copy.SetFlags(tfRecording);  // changed a running recording, restore flag "tfRecording"
    dsyslog("live: new timer flags: %u", copy.Flags());
    *oldTimer = copy;

    Timers->SetModified();
    isyslog("live: local timer %s modified (%s)", *oldTimer->ToDescr(), oldTimer->HasFlags(tfActive) ? "active" : "inactive");
  }

  void TimerManager::CreateTimer(cStr remote, cStr builder)
  {
    if (!remote.empty() ) {  // add remote timer via svdrpsend
      dsyslog3("add remote timer");
      cToSvConcat command("NEWT ", builder);
      int svdrpOK = ExecSVDRPCommandReportErrors(remote, command.c_str(), "CreateTimer()");
      if (svdrpOK == 0) isyslog("live: remote timer '%s' on server '%s' added", builder.c_str(), remote.c_str() );
    } else {
      dsyslog3("add local timer");
      std::unique_ptr<cTimer> newTimer(new cTimer);
      if (!newTimer->Parse(builder.c_str()) ) {
        esyslog3("error in settings for local timer");
        throw HtmlError(tr("Error in timer settings") );
        return;
      }
#ifdef DEBUG_LOCK
      dsyslog3("LOCK_TIMERS_WRITE");
#endif
      LOCK_TIMERS_WRITE;
      Timers->SetExplicitModify();
      const cTimer *checkTimer = Timers->GetTimer(newTimer.get() );
      if (checkTimer) {
        esyslog3(tr("Timer already defined"));
        throw HtmlError(tr("Timer already defined") );
        return;
      }
      Timers->Add( newTimer.get() );
      Timers->SetModified();
      isyslog( "live: local timer %s added", *newTimer->ToDescr() );
      newTimer.release();
    }
  }

  void TimerManager::DeleteTimer(int timerId, cStr remote)
  {
    if (!remote.empty() ) {
// delete remote timer via svdrpsend
      dsyslog3("delete remote timer, timerid '", timerId, "' remote '", remote, "'");
      cToSvConcat command("DELT ", timerId);
      int svdrpOK = ExecSVDRPCommandReportErrors(remote, command.c_str(), "DeleteTimer()");
      if (svdrpOK == 0) {
        isyslog("live: remote timer '%s' on server '%s' deleted", command.c_str(), remote.c_str() );
      }
    } else {
// delete local timer
      dsyslog3("delete local timer, timerid '", timerId, "'");
#ifdef DEBUG_LOCK
      dsyslog3("LOCK_TIMERS_WRITE");
#endif
      LOCK_TIMERS_WRITE;
      Timers->SetExplicitModify();
      cTimer* timer = Timers->GetById(timerId);
      if (!timer) {
        esyslog3("Local timer '", timerId, "' not defined");
        throw HtmlError(tr("Timer not defined") );
        return;
      }
      cString timer_desc = timer->ToDescr();
      if (timer->Recording() ) {
        timer->Skip();
        cRecordControls::Process(Timers, time( 0 ) );
      }
      Timers->Del(timer);
      Timers->SetModified();
      isyslog("live: local timer %s deleted", *timer_desc);
    }
  }

  std::string TimerManager::DeActivateTimer(cSv id, bool activate) {
    // activate   the timer if activate == true
    // deactivate the timer if activate == false
    TimerConflictNotifier timerNotifier;
    {
      LOCK_TIMERS_WRITE
      Timers->SetExplicitModify();
      cTimer* timer = (cTimer*)SortedTimers::GetByTimerId(SortedTimers::DecodeDomId(id), Timers);
      if (!timer) return JsonReturnOneObjectNotFound(id, tr("Timer with id %s not found"));
      if (timer->HasFlags(tfActive) == activate)
        return JsonReturnOneObject(id, timer->File(), false, true, activate?tr("Timer already active"):tr("Timer already inactive"));
      Timers->SetModified();
      timer->OnOff();
      if (timer->Remote()) {
        Timers->SetSyncStateKey(StateKeySVDRPRemoteTimersPoll);
        int svdrpOK = ExecSVDRPCommandReportErrors(timer->Remote(), cToSvConcat("MODT ", timer->Id(), " ", *timer->ToText(true)).c_str(), "TimerManager_ActivateTimer()");
        if (svdrpOK != 0) {
          timerNotifier.SetTimerModification();
          return JsonReturnOneObject(id, timer->File(), false, true, trVDR("Error while accessing remote timer"));
        }
      }
      {
        LOCK_SCHEDULES_READ;
        timer->SetEventFromSchedule(Schedules);
      }
      timerNotifier.SetTimerModification();
      return JsonReturnOneObject(id, timer->File(), true);
    }
  }

  const cTimer* TimerManager::GetTimer(const cEvent *event, const cChannel *channel, const cTimers *Timers)
  {
    if (!event || !channel) return nullptr;
    for (const cTimer* timer = Timers->First(); timer; timer = Timers->Next(timer)) {
      if (timer->Channel() == channel && (timer->Event() == event || timer->Matches(event) == tmFull))
        return timer;
    }
    return nullptr;
  }

  const cTimer* TimerManager::GetTimer(tEventID eventid, tChannelID channelid, const cTimers *Timers)
  {
    LOCK_CHANNELS_READ;
    const cChannel *channel = Channels->GetByChannelID(channelid);
    if (!channel) return nullptr;
    LOCK_SCHEDULES_READ;
    const cSchedule *schedule = Schedules->GetSchedule(channel);
    if (!schedule) return nullptr;
#if APIVERSNUM >= 20502
    const cEvent *event = schedule->GetEventById(eventid);
#else
    const cEvent *event = schedule->GetEvent(eventid);
#endif
    return GetTimer(event, channel, Timers);
  }
  std::string TimerManager_CreateTimer(cSv epgid)
// See confirm.h for documentation if required Json return structure
  {
    dsyslog3("create default timer");
#ifdef DEBUG_LOCK
    dsyslog3("LOCK_TIMERS_WRITE");
#endif
    LOCK_TIMERS_WRITE;
    LOCK_CHANNELS_READ;
    LOCK_SCHEDULES_READ;
    Timers->SetExplicitModify();
    const cEvent *event = EpgEvents::GetEventByEpgId(epgid, Schedules);
    if (!event) {
      esyslog3("event ", epgid, " not found");
      return JsonReturnOneObjectNotFound(epgid, tr("Event with id %s not found"));
    }
    cTimer *Timer = new cTimer(event);
    if (::Setup.SVDRPPeering && *::Setup.SVDRPDefaultHost)
      Timer->SetRemote(::Setup.SVDRPDefaultHost);
    if (Timers->GetTimer(Timer)) {
      std::string result = JsonReturnOneObject(SortedTimers::GetEncodedTimerId(*Timer), Timer->File(), false, true, tr("Timer already defined"));
      delete Timer;
      return result;
    }
    Timers->Add(Timer);
    cString ErrorMessage;
    if (!HandleRemoteTimerModifications(Timer, nullptr, &ErrorMessage) ) {
// must add the timer before HandleRemoteModifications to get proper log messages with timer ids
      esyslog3("creating timer ", *Timer->ToDescr(), " ErrorMessage: ", *ErrorMessage);
      std::string result = JsonReturnOneObject(SortedTimers::GetEncodedTimerId(*Timer), Timer->File(), false, false, *ErrorMessage);
      Timers->Del(Timer);
      return result;
    }
    Timers->SetModified();
    if (Timer->Remote())
      Timers->SetSyncStateKey(StateKeySVDRPRemoteTimersPoll);

    TimerConflictNotifier timerNotifier;
    timerNotifier.SetTimerModification();

    isyslog("live: timer %s added", *Timer->ToDescr() );
    return JsonReturnOneObject(SortedTimers::GetEncodedTimerId(*Timer), Timer->File(), true);
  }

  std::string TimerManager_DeleteConfirmationQuestion(cSv id, bool &all_exist) {
    std::string tId = SortedTimers::DecodeDomId(id);
    LOCK_TIMERS_READ;
    const cTimer* timer = SortedTimers::GetByTimerId(tId, Timers);
    all_exist = timer != nullptr;
    if (all_exist) return std::string(cToSvFormatted(tr("Delete timer \"%s\"?"), timer->File() ));
    return std::string();
  }
  std::string TimerManager_DeleteTimer(cSv id) {
    int timer_id = -1;
    cToSvConcat name;
    cToSvConcat remote;
    std::string tId = SortedTimers::DecodeDomId(id);
    {
      LOCK_TIMERS_READ;
      const cTimer* timer = SortedTimers::GetByTimerId(tId, Timers);
      if (!timer)
        return JsonReturnOneObjectNotFound(tId, tr("Timer with id %s not found"));
      timer_id = timer->Id();
      remote << timer->Remote();
      name   << timer->File();
    }
    std::string result = JsonReturnOneObject(tId, name, true);

    TimerManager().DeleteTimer(timer_id, cStr(remote) );
    TimerConflictNotifier timerNotifier;
    timerNotifier.SetTimerModification();

    return result;
  }

} // namespace vdrlive
