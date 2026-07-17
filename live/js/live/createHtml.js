/*
 * This is part of the live VDR plugin. See COPYING for license information.
 *
 * Helper functions to create HTML.
 */


function LabelAndAction(label, action) {
  let html = ''
  if (label) {
    html += '<p>'
    html += label.replace(/~/, '~<wbr>').replace(/<br[ /]*>|\\n/, '</p><p>')
    html += '</p>'
  }
  if (action) {
    html += '<p class=\"click-action\">'
    html += action
    html += '</p>'
  }
  return html
}

function addEncodeHtml(s, str) {
  s.a += str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\n\r]/g, '<br/>');
}

function truncateOnWordIdx(str, limit) {
  var b = str.indexOf('&lt;br/&gt;')
  if (b >= 0 && b<= limit) return b
  var c = str.indexOf('<br/>')
  if (c >= 0 && c<= limit) return c
  var r = str.indexOf('\r')
  if (r >= 0 && r<= limit) return r
  var n = str.indexOf('\n')
  if (n >= 0 && n<= limit) return n
  if (str.length <= limit) return str.length
  var l = str.lastIndexOf(' ', limit);
  if (l <= 0) l = limit
  return l
}

function truncateOnWord(str, limit) {
  var l = truncateOnWordIdx(str, limit)
  if (str.length == l) return str
  return str.slice(0,l) + ' ...'
}

function addTime(s, time) {
// add time in seconds, in format minutes:ss
  var d_sec = time%60
  s.a += String((time-d_sec)/60)
  s.a += ':'
  var d_sec_ld = d_sec%10
  s.a += String.fromCharCode(48+(d_sec-d_sec_ld)/10,48+(d_sec%10))
}

function addScraperImageTitle(s, image, pt, title, seasonEpisode, runtime, date) {
// pt: "pt" if m_s_image.width <= m_s_image.height, otherwise= ""
// seasonEpisode: e.g. 3E8    (we will add the missing S ...)
  s.a += '<div class=\"thumb\"><img loading="lazy" data-src=\"';
  if (image.length != 0) {
    s.a += '/tvscraper/'
    s.a += image
    s.a += '?thumb=1&cache_max_age=2592000\" class=\"thumb'
    s.a += pt
  } else s.a += 'img/transparent.svg\" style=\"height: var(--icon-height, 16px)'
  if (title.length != 0 || date.length != 0) {
// scraper data available
    s.a += '\"  alt=\"\" title=\"<p>'
    s.a += title
    if (seasonEpisode.length != 0) {
      s.a += '</p><p>S'
      s.a += seasonEpisode
    }
    if (runtime.length != 0) {
      s.a += '</p><p>'
      s.a += runtime
    }
    if (date.length != 0) {
      s.a += '</p><p>'
      s.a += date
    }
    s.a += '</p>'
  }
  s.a += '\"/></div>'
}
function addTruncMedia(s, text, lims, liml) {
// lims: Text limit for small screens
// liml: Text limit for wide screens
  var ls = truncateOnWordIdx(text, lims)
  s.a += text.slice(0,ls)
  if (text.length == ls) return
  if (text.length <= lims) {
    s.a += ' ...'
    return
  }
  var ll = truncateOnWordIdx(text, liml)
  s.a += '<span class="hidden-xs">'
  s.a += text.slice(ls, ll)
  s.a += '</span>'
  if (text.length == ll) s.a += '<span class="display-xs"> ...</span>'
  else s.a += ' ...'
}

function add2ndLine(s, shortText, description, href) {
// second line (title / short text). Truncate, use description, ...
  s.a += '<div class="short">'
  if (shortText.length != 0) {
    s.a += '<a '
    s.a += href
    s.a += '>'
    addTruncMedia(s, shortText, 50, 80)
    s.a += '</a>'
  } else  if (description.length > 0) {
    s.a += '<a '
    s.a += href
    s.a += '>'
    addTruncMedia(s, description, 50, 80)
    s.a += '</a>'
  } else {
    s.a += '&nbsp;'
  }
  s.a += '</div>'
}

// do not HTML-encode title; will be HTML-encoded here!
function addColEventRec(s, still_recording, times, eventprefix, eventid, title, folder, shortText, description) {
// col with times, channel, name, short text
  s.a += '<div class="withmargin'
  s.a += '"><div class="margin-bottom display-xs"><span class="normal-font">'
  s.a += times
  s.a += '</span></div>'
// sec&third line: Link to event, event title, short text
  s.a += '<div class="'
  s.a += still_recording
  s.a += '">'
  addEventRec(s, eventprefix, eventid, '&history_num_back=1', title, folder, shortText, description)
  s.a += '</div></div>'
}

function injectHdSdIcon(elementId, sdhd, channelName, frameParams) {
  const s = Object.create(null);
  s.a = "";
  addHdSdIcon(s, sdhd, channelName, frameParams);
  document.getElementById(elementId).innerHTML = s.a;
  if (typeof liveEnhanced !== 'undefined') liveEnhanced.domReadySetup();
}

function injectErrorHdSdIcon(elementId, numErrors, durationDeviation, sdhd, channelName, duration, numTsFiles, frameParams, isPesRecording) {
  const s = Object.create(null);
  s.a = "";
  addErrorIcon(s, numErrors, durationDeviation, duration, numTsFiles, isPesRecording);
  addHdSdIcon(s, sdhd, channelName, frameParams);
  document.getElementById(elementId).innerHTML = s.a;
  if (typeof liveEnhanced !== 'undefined') liveEnhanced.domReadySetup();
}

function imgLoad() {
var imgDefer = document.getElementsByTagName('img');
  for (var i = 0; i < imgDefer.length; i++) {
    if (imgDefer[i].getAttribute('data-src')) {
      imgDefer[i].setAttribute('src',imgDefer[i].getAttribute('data-src'));
    }
  }
}

function clearRecordingsFilter(filter, currentSort, currentFlat, recycle_bin) {
// clear filter field
  filter.value = "";
  filterRecordings(filter, currentSort, currentFlat, recycle_bin)
}
function clearCheckboxes(form) {
// clearing checkboxes
  if (form) {
// note: in case of no recordings there is no form
    var inputs = form.getElementsByTagName('input');
    for (var i = 0; i<inputs.length; i++) {
      if (inputs[i].type == 'checkbox') {
          inputs[i].checked = false;
      }
    }
  }
}

async function actionOnMarkedRecordings(act, text, confirm_ = true) {
// act = 'del' or 'pur' or "res' or 'mov' oe 'rcd'
// if (act == 'mov'), text is ignored / replaced with the folder
// if text is available, it will be encoded in recid
//
  let epgid=act+'_recording_';
  if (act == 'mov') {
    const newdir = document.getElementById("newdir");
    if (newdir.disabled) {
      const dir = document.getElementById("directory");
      text = dir.value;
    } else {
      text = newdir.value;
    }
  }
  if (text != undefined) {
    epgid += new TextEncoder().encode(text).length;   // convert to utf8 and count bytes
    epgid += '_';
    epgid += text;
    epgid += '_';
  }

  let items = 0;
  const inputs = document.getElementsByTagName('input');
  for (var i = 0; i<inputs.length; i++) {
    if (inputs[i].type == 'checkbox' && inputs[i].checked &&
        inputs[i].value && inputs[i].value.startsWith('recording_')) {
      epgid += inputs[i].value.substring(10);
      epgid += '_';
      items++;
    }
  }
  if (!items) {
    replace_action_results();
    return;
  }

  if (!confirm_ || is_popup_disabled(epgid) ) {
    action(epgid);
    return;
  }
  if (typeof liveEnhanced !== 'undefined') {
    const event_ = new DOMEvent(event);
    const merged_options = Object.merge(liveEnhanced.options.infoWinOptions, { onDomExtend: liveEnhanced.domExtend.bind(liveEnhanced) });
    const infowin = new InfoWin_Ajax(epgid, "epginfo.html?epgid="+encodeURIComponent(epgid), merged_options);
    infowin.options.offsets.y = -400;
    infowin.show(event_);
    event_.stop();
  } else alert("ERROR createHtml.js, actionOnMarkedRecordings, liveEnhanced not defined");
}

function disable_popup_if_user_checked(id, param) {
  // id is the hash
  // param is the epgid
  let cb = document.getElementById("disable_popup_" + id);
  if (cb && cb.type == 'checkbox' && cb.checked) {
    disable_popup(param);
  }
}
function action_number_successful(json_result) {
  if (!json_result.objects) return 0;
  let i = 0;
  json_result.objects.forEach(object => {
    if (object.success) ++i;
  });
  return i;
}
function action_number_unsuccessful(json_result) {
  if (!json_result.objects) return 0;
  let i = 0;
  json_result.objects.forEach(object => {
    if (!object.success) ++i;
  });
  return i;
}

function toggleLog(button, id) {
  const log = document.getElementById(id);
  if (button && log) {
    if (log.style.display) {
      button.src = getThemedLinkPrefixImg() + "icon_overlay_minus.svg";
      button.store("tip:title", get_text_Collapse_the_log());
      log.style.display = "";
    } else {
      button.src = getThemedLinkPrefixImg() + "icon_overlay_plus.svg";
      button.store("tip:title", get_text_Expand_the_log());
      log.style.display = "none";
    }
  }
}

function inject_rec_command_results(parent_element, json_result)
{
  if (json_result.command) {
    const div_result_header = parent_element.appendChild(document.createElement("div"));
    div_result_header.className = "result-header";
    const div_header_data = div_result_header.appendChild(document.createElement("div"));
    div_header_data.className = "header-data";
    const div_header_command = div_header_data.appendChild(document.createElement("div"));
    div_header_command.className = "header-command";
    div_header_command.textContent = json_result.command;
  }
  const n_successful = action_number_successful(json_result);
  if (n_successful == 0) {
    const div_result_header = parent_element.appendChild(document.createElement("div"));
    div_result_header.className = "result-header";
    const div_header_data = div_result_header.appendChild(document.createElement("div"));
    div_header_data.className = "header-data";
    const div_header_message = div_header_data.appendChild(document.createElement("div"));
    div_header_message.className = "message error";
    div_header_message.textContent = get_texts(json_result.action).headline_0;
    return;
  }
  var id = 1;
  json_result.objects.forEach(object => {
    // header with recording name and collapse/expand button
    let log_id = "result-log-" + id++;
    const div_result_header = parent_element.appendChild(document.createElement("div"));
    div_result_header.className = "result-header";
    const div_header_data = div_result_header.appendChild(document.createElement("div"));
    div_header_data.className = "header-data";
    const div_recording_name = div_header_data.appendChild(document.createElement("div"));
    div_recording_name.className = "recording-name";
    div_recording_name.textContent = object.name;
    if (object.success) {
      const div_log_expander = div_header_data.appendChild(document.createElement("img"));
      div_log_expander.className = "iconic button log-expander";
      div_log_expander.src = getThemedLinkPrefixImg() + "icon_overlay_minus.svg";
      div_log_expander.setAttribute("title", get_text_Collapse_the_log());
      div_log_expander.setAttribute("onclick", "toggleLog(this, '" + log_id + "');");
      div_result_header.appendChild(document.createElement("div")).className = "spacebar";
      // log (or error message) of recording-command execution
      const div_result_log = parent_element.appendChild(document.createElement("div"));
      div_result_log.className = "result-log";
      div_result_log.id = log_id;
      div_result_log.appendChild(document.createElement("div")).className = "spacebar";
      const div_console = div_result_log.appendChild(document.createElement("pre"));
      div_console.className = "console";
      div_console.textContent = object.message;
      div_result_log.appendChild(document.createElement("div")).className = "spacebar";
    } else {
      div_recording_name.classList.add("error");
    }
  });
}

function inject_action_results(parent_element, json_result)
{
  // header for success message
  const div_result_header = parent_element.appendChild(document.createElement("div"));
  div_result_header.className = "result-header";
  const div_header_data = div_result_header.appendChild(document.createElement("div"));
  div_header_data.className = "header-data";
  const div_header_message = div_header_data.appendChild(document.createElement("div"));
  div_header_message.className = "message";
  const n_successful = action_number_successful(json_result);
  if (n_successful == 0) {
    div_header_message.textContent = get_texts(json_result.action).headline_0;
    div_header_message.classList.add("error");
  } else
    div_header_message.textContent = get_texts(json_result.action).headline_n;
  // list of successful objects
  if (n_successful > 0) {
    const log_id = "result-log-success";
    const div_log_expander = div_header_data.appendChild(document.createElement("img"));
    div_log_expander.className = "iconic button log-expander";
    div_log_expander.src = getThemedLinkPrefixImg() + "icon_overlay_minus.svg";
    div_log_expander.setAttribute("title", get_text_Collapse_the_log());
    div_log_expander.setAttribute("onclick", "toggleLog(this, '" + log_id + "');");
    div_result_header.appendChild(document.createElement("div")).className = "spacebar";
    const div_result_log = parent_element.appendChild(document.createElement("div"));
    div_result_log.className = "result-log";
    div_result_log.id = log_id;
    div_result_log.appendChild(document.createElement("div")).className = "spacebar";
    const ul_action_log = div_result_log.appendChild(document.createElement("ul"));
    ul_action_log.className = "action-log";
    json_result.objects.forEach(object => {
      if (object.success) {
        const li_item = ul_action_log.appendChild(document.createElement("li"));
        const span_name = li_item.appendChild(document.createElement("span"));
        span_name.className = "name";
        span_name.textContent = object.name;
      }
    });
    div_result_log.appendChild(document.createElement("div")).className = "spacebar";
  }
  // display individual errors, if any
  const n_errors = action_number_unsuccessful(json_result);
  if (n_errors > 0) {
    // we have individual errors
    const log_id = "result-log-failure";
    const div_result_header = parent_element.appendChild(document.createElement("div"));
    div_result_header.className = "result-header";
    const div_header_data = div_result_header.appendChild(document.createElement("div"));
    div_header_data.className = "header-data";
    const div_header_message = div_header_data.appendChild(document.createElement("div"));
    div_header_message.className = "message error";
    div_header_message.textContent = get_texts(json_result.action).headline_error;
    const div_log_expander = div_header_data.appendChild(document.createElement("img"));
    div_log_expander.className = "iconic button log-expander";
    div_log_expander.src = getThemedLinkPrefixImg() + "icon_overlay_minus.svg";
    div_log_expander.setAttribute("title", get_text_Collapse_the_log());
    div_log_expander.setAttribute("onclick", "toggleLog(this, '" + log_id + "');");
    div_result_header.appendChild(document.createElement("div")).className = "spacebar";
    // list of unsuccessful objects
    const div_result_log = parent_element.appendChild(document.createElement("div"));
    div_result_log.className = "result-log";
    div_result_log.id = log_id;
    div_result_log.appendChild(document.createElement("div")).className = "spacebar";
    const ul_action_log = div_result_log.appendChild(document.createElement("ul"));
    ul_action_log.className = "action-log";
    json_result.objects.forEach(object => {
      if (!object.success) {
        const li_item = ul_action_log.appendChild(document.createElement("li"));
        const span_name = li_item.appendChild(document.createElement("span"));
        span_name.className = "name error";
        span_name.textContent = object.name;
        if (object.message) {
          span_name.textContent += ": ";
          const span_message = li_item.appendChild(document.createElement("span"));
          span_message.className = "message error";
          span_message.textContent = object.message;
        }
      }
    });
    div_result_log.appendChild(document.createElement("div")).className = "spacebar";
  }
}

function replace_action_results(json_result = null) {
  const parent_element = document.getElementById('action_command_results');
  if (parent_element) {
    // delete old content / old results
    while (parent_element.firstChild) parent_element.removeChild(parent_element.lastChild);

    // just to be on the safe side, check for empty request
    if (!json_result) {
      const div_result_header = parent_element.appendChild(document.createElement("div"));
      div_result_header.className = "result-header";
      const div_header_data = div_result_header.appendChild(document.createElement("div"));
      div_header_data.className = "header-data";
      const div_header_message = div_header_data.appendChild(document.createElement("div"));
      div_header_message.className = "message error";
      div_header_message.textContent = get_text_Nothing_selected();
      parent_element.style.display = '';
      return;
    }
    // check for generic error
    if (!json_result.success) {
      const div_result_header = parent_element.appendChild(document.createElement("div"));
      div_result_header.className = "result-header";
      const div_header_data = div_result_header.appendChild(document.createElement("div"));
      div_header_data.className = "header-data";
      const div_header_message = div_header_data.appendChild(document.createElement("div"));
      div_header_message.className = "message error";
      div_error_message.textContent = json_result.message;
    } else {
      // overall processing OK, so display command and individual results
      if (json_result.action == "rcd")
        inject_rec_command_results(parent_element, json_result);
      else
        inject_action_results(parent_element, json_result);
    }
    parent_element.style.display = '';
    if (typeof liveEnhanced !== 'undefined') liveEnhanced.domReadySetup();
  } else {
    console.log("Info: action results are not displayed on this page. You can add the element with id 'action_command_results' if the system should display the action results on this page");
  }
}
function action_reload(history_num_back) {
  if (history_num_back > 0) history.go(-history_num_back);
  else location.reload();
}
async function action(id, history_num_back=0)
{
  const response = await fetch('action.html?id=' + encodeURIComponent(id));
  const text = await response.text();

  try {
    const ret_object = JSON.parse(text);
    const reload = ret_object.reload_required || history_num_back > 0;
    if (reload) {
      // save result in sessionStorage, the page will display it during reload
      sessionStorage.setItem("action_result", text);
      if (history_num_back > 0) history.go(-history_num_back);
      else location.reload();
    } else {
      // directly change dom to display result
      replace_action_results(ret_object);
    }
  } catch(e) {
    console.log("Error parsing Json result from url action.html?id=" + encodeURIComponent(id));
    console.log(text)
    console.log("Error message: "+e.message);
    alert ("Error parsing Json result");
  }
}
function action_back(id, param, history_num_back)
{
  disable_popup_if_user_checked(id, param);
  action(param, history_num_back);
}
/*
async function createTimer(epgid) {
  action("crt_event_"+epgid);
}
*/
function back_depending_referrer(back_epginfo, back_others) {
  if (document.referrer.indexOf("epginfo.html?") != -1) {
    history.go(-back_epginfo);
  } else {
    history.go(-back_others);
  }
}
async function rec_string_d_a(rec_ids, folderId) {
  const st = Object.create(null)
  st.a = ""
  let res = await RecordingsSt_a(st, rec_ids[0], rec_ids[1], rec_ids[2], folderId)
  return st.a
}

// events[day][0]: day
// events[day][1][ev][0][]: event data
// events[day][1][ev][1][]: if available: existing recording data
//
function addEventList(s, col_span, events) {
  s.a += '<table class="listing schedule" cellspacing="0" cellpadding="0">'
  for (let day=0; day < events.length; day++) {
    if (day != 0) {
      s.a += '<tr class="spacer"><td colspan='
      s.a += col_span
      s.a += '/></tr>\n'
    }
    s.a += '<tr class="head"><td colspan='
    s.a += col_span
    s.a += '><div class="boxheader"><div class="caption">'
    s.a += events[day][0]
    s.a += '</div></div></td></tr>'
    for (let event_=0; event_ < events[day][1].length; event_++) {
      if (events[day][1][event_].length == 1 && event_ == events[day][1].length-1) {
        addEvent(s, 1, events[day][1][event_][0])    // bottom
      } else {
        addEvent(s, 0, events[day][1][event_][0])
      }
      if (events[day][1][event_].length == 2) {
// existing recording
        if (event_ == events[day][1].length-1) {
          bottomrow = 'bottomrow'
        } else {
          bottomrow = ''
        }
// note: data is written as needed by existingRecordingString
// which differs somewhat from existingRecordingSR
        existingRecordingSR(s, col_span-2, bottomrow, events[day][1][event_][1][2], events[day][1][event_][1][0], events[day][1][event_][1][1], events[day][1][event_][1][3], events[day][1][event_][1][4], events[day][1][event_][1][5], events[day][1][event_][1][6], events[day][1][event_][1][7], events[day][1][event_][1][8], events[day][1][event_][1][9], events[day][1][event_][1][10], events[day][1][event_][1][11], events[day][1][event_][1][12], events[day][1][event_][1][13], events[day][1][event_][1][14], events[day][1][event_][1][15], events[day][1][event_][1][16], events[day][1][event_][1][17], events[day][1][event_][1][18], events[day][1][event_][1][19], events[day][1][event_][1][21], events[day][1][event_][1][23])
      }
    }
  }
  s.a += '</table>\n'
}
function addEventListString(col_span, events) {
  const s = Object.create(null)
  s.a = ""
  addEventList(s, col_span, events)
  return s.a
}

//The following cookie functions have evolved from the examples of http://www.quirksmode.org/js/cookies.html
function createCookie(name, value, days)
{
  const scope = "; SameSite=Lax; path=/"
  var expiration = "";   // defaults to session cookie
  if (days > 0) {
    // cookie with expiration time
    let date = new Date();
    date.setTime(date.getTime() + days * 24*60*60*1000);
    expiration = "; expires=" + date.toGMTString();
  } else if (days < 0) {
    // already expired cookie, i.e., cookie to be deleted
    let date = new Date(0);
    expiration = "; expires=" + date.toGMTString();
  }
  var cookie = name + "=" + value + expiration + scope;
  if (cookie.length >= 4096 ) {
    // oversized cookie deleted to avoid truncation issues
    let date = new Date(0);
    expiration = "; expires=" + date.toGMTString();
    cookie = name + "=" + expiration + scope;
  }
  document.cookie = cookie;
}

function readCookie(name)
{
  var nameEQ = name + "=";
  for (let c of document.cookie.split(';')) {
    c = c.trim();
    if (c.startsWith(nameEQ)) return c.substring(nameEQ.length);
  }
  return null;
}

function eraseCookie(name)
{
  createCookie(name, "", -1);
}
