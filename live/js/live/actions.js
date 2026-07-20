/*
 * This is part of the live VDR plugin. See COPYING for license information.
 *
 * This javascript file is included in ALL live pages using
 *    <& pageelems.scripts &>
 * so every page can rely on availability of these functions
 *
 * =================================================================
 * functions for actions defined in config.h
 * =================================================================
 */

// the actions defined in config.h are available in js in action_texts
function get_texts(action) {
  for (const texts of action_texts) {
    if(action == texts.id) return texts;
  }
  console.log("action '"+action+"' not found");
}
function is_action(epgid) {
  if (epgid.length < 4) return false;
  const action = epgid.substring(0, 3);
  for (const texts of action_texts) {
    if(action == texts.id) return true;
  }
  return false;
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
function click_reccommands_folder_line(e, fldr_hash) {
  const reccommands_list = document.getElementById(fldr_hash);
  if (!reccommands_list) return;

  if (reccommands_list.style.display == 'none') {
    set_icons_open(document.getElementById('pm_'+fldr_hash), document.getElementById('fs_'+fldr_hash));
    reccommands_list.style.display = '';
  } else {
    set_icons_closed(document.getElementById('pm_'+fldr_hash), document.getElementById('fs_'+fldr_hash));
    reccommands_list.style.display = 'none';
  }
}
