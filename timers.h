#ifndef VDR_LIVE_TIMERS_H
#define VDR_LIVE_TIMERS_H

// STL headers need to be before VDR tools.h (included by <vdr/timers.h>)
#include <list>
#include <string>

#include <cxxtools/log.h>  // must be loaded before any VDR include because of duplicate macros (LOG_ERROR, LOG_DEBUG, LOG_INFO)

#include <vdr/timers.h>
#include "stringhelpers.h"

namespace vdrlive {

  class SortedTimers
  {
    public:
      static std::string GetTimerId(cTimer const& timer);
      static const cTimer* GetByTimerId(cSv timerid, const cTimers* Timers);

      // en- or decodes a timer into an id usable for DOM Ids.
      static std::string EncodeDomId(cSv timerid);
      static std::string GetEncodedTimerId(cTimer const& timer);
      static std::string DecodeDomId(cSv timerDomId);

      static std::string GetTimerDays(cTimer const *timer);
      static std::string GetTimerInfo(cTimer const& timer);
template<std::size_t N>
      static cSv SearchTimerInfo(cTimer const& timer, const char (&value)[N] ) {
        return partInXmlTag(partInXmlTag(timer.Aux(), "epgsearch"), value);
      }
      static std::string TvScraperTimerInfo(cTimer const& timer, std::string &recID, std::string &recName);
  };

  class TimerManager
  {
    public:
      void UpdateTimer(int timerId, cStr remote, cStr oldRemote, cStr builder);
      void DeleteTimer(int timerId, cStr remote);
      static std::string DeActivateTimer(cSv id, bool activate);
      static const cTimer* GetTimer(tEventID eventid, tChannelID channelid, const cTimers* Timers);
      static const cTimer* GetTimer(const cEvent *event, const cChannel *channel, const cTimers* Timers);
      static int ExecSVDRPCommandReportErrors(cStr ServerName, const char *Command, cSv context);

    private:
      void CreateTimer(cStr remote, cStr builder);
  };
  std::string TimerManager_DeleteConfirmationQuestion(cSv id, bool &all_exist);
  std::string TimerManager_DeleteTimer(cSv id);
  std::string TimerManager_CreateTimer(cSv id);

  inline std::string TimerManager_DeactivateTimer(cSv id) {
    return TimerManager::DeActivateTimer(id, false);
  }
  inline std::string TimerManager_ActivateTimer(cSv id) {
    return TimerManager::DeActivateTimer(id, true);
  }

} // namespace vdrlive

#endif // VDR_LIVE_TIMERS_H
