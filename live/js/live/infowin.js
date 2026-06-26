/*
 * This is part of the live VDR plugin. See COPYING for license information.
 *
 * InfoWin.js
 *
 * InfoWin class, InfoWin.Manager class, InfoWin_Ajax class.
 *
 * Extension of mootools to display a popup window with some HTML
 * code.
 */

/*
Class: InfoWin
  Create an information window as overlay to current page.

Arguments:

Options:

Note:
  A window consists of a frame-element. This is the overall
  containing element used to control the display and size of the
  window. It is accessible through the 'winFrame' property.

  The InfoWin class provides the following properties to fill the
  window with content:

    - titleBox:  The element containing the title of the window.
    - buttonBox: The default window buttons are created here.
    - winBody:   This is where the actual window contents goes.
    - resizeBox: The element acting as anchor for the resize handle.
                 If resize is supported by the browser, this element
                 will remain invisible.
 */
var InfoWin = new Class({
    Implements: [Options],
    options: {
      timeout: 0,
      onShow: Class.empty,
      onHide: Class.empty,
      onDomExtend: Class.empty,
      destroyOnHide: false,
      className: 'info',
      wm: false, // override default window manager.
      draggable: true,
      resizable: true,
      resizeImg: 'img/transparent.svg',
      closeImg: 'img/icon_overlay_cross.svg',
      pinImg: 'img/icon_overlay_pin.svg',
      pinnedImg: 'img/icon_overlay_pinned.svg',
      bodySelect: 'div.content',
      titleSelect: 'div.caption',
      classSuffix: '-win',
      idSuffix: '-id',
      offsets: {'x': 0, 'y': 0}
    },

    initialize: function(id, options){
      this.setOptions(options);
      this.wm = this.options.wm || InfoWin.$wm;
      winFrameId = id + this.options.classSuffix + this.options.idSuffix;
      this.css = {'selector': 'div#' + winFrameId + ' '};
      this.winFrame = $(winFrameId);
      if (this.winFrame == undefined){
        this.buildFrame(id);
        this.build(id);
        this.wm.register(this);
      }
    },

    // internal: build new window element.
    //
    // build sets up a frame for a new InfoWin. The parent element
    // of the window frame has the id '<id>-win-id'. The function
    // must return true if the body of the InfoWin has been filled
    // with the user data, false otherwise.
    build: function(id){
      // header of window: upper shadows, corners title and controls
      var top = new Element('div', {
          'class': this.options.className + this.options.classSuffix + '-top'
        }).inject(this.winFrame);
      if (this.options.draggable) {
        top.setStyle('cursor', 'grab');;
        this.winFrame.makeDraggable({'handle': top, 'onComplete': function()
          { // make sure the window is within the 'content' container;
            // as the 'content' element uses scrolling, we do not need
            // to check for overflow in scroll direction
            if (this.element.offsetLeft < 0) {
              this.element.style.left = '0px';
            }
            if (this.element.offsetTop < 0) {
              this.element.style.top = '0px';
            }
          }
        });
      }
      this.titleBox = new Element('div', {
          'class': this.options.className + this.options.classSuffix + '-title'
        }).inject(top);

      this.buttonBox = new Element('div', {
          'class': this.options.className + this.options.classSuffix + '-buttons'
        }).inject(top);
      this.pinButton = new Element('img', {
          'src': this.options.pinImg,
          'class': 'iconic button pin',
          'alt': 'pin'
        }).inject(this.buttonBox);
      this.pinButton.addEvent('click', function(event){
          var event_;
          if (MooTools.version == '1.11') {
            event_ = new Event(event);
          } else {
            event_ = new DOMEvent(event);
          }
          winFrameRect = this.winFrame.getBoundingClientRect();
          if (this.winFrame.style.position == 'fixed') {
            // floating coordinates refer to the 'content' element
            content = document.getElementById('content');
            contentRect = content.getBoundingClientRect();
            this.winFrame.style.position = "absolute";
            this.winFrame.style.left = (winFrameRect.left - contentRect.left + content.scrollLeft) + 'px';
            this.winFrame.style.top  = (winFrameRect.top  - contentRect.top  + content.scrollTop ) + 'px';
            this.pinButton.src = this.options.pinImg;
          } else {
            // fixed coordinates refer to the viewport
            this.winFrame.style.position = 'fixed';
            this.winFrame.style.left = winFrameRect.left + 'px';
            this.winFrame.style.top  = winFrameRect.top  + 'px';
            this.pinButton.src = this.options.pinnedImg;
          }
          event_.stop();
          return false;
        }.bind(this));
      closeButton = new Element('img', {
          'src': this.options.closeImg,
          'class': 'iconic button close',
          'alt': 'close'
        }).inject(this.buttonBox);
      closeButton.addEvent('click', function(event){
          var event_;
          if (MooTools.version == '1.11') {
            event_ = new Event(event);
          } else {
            event_ = new DOMEvent(event);
          }
          event_.stop();
          return this.hide();
        }.bind(this));

      // body of window: user content.
      this.winBody = new Element('div', {
          'class': this.options.className + this.options.classSuffix + '-body'
        }).inject(this.winFrame);

      // by default, we rely on the CSS 'resize' property to for resizing;
      // if unsupported, and as fall-back approach, we inject a distinct
      // resize element for the resize handle of the mootools.
      if (this.options.resizable) {
        var resizeBox = new Element('div', {
            'class': this.options.className + this.options.classSuffix + '-resize'
          }).inject(this.winFrame);
        var icon = new Element('img', {
            'src': this.options.resizeImg,
            'class': 'icon resize',
            'alt': 'resize'
          }).inject(resizeBox);
        this.winFrame.makeResizable({'handle': resizeBox});
      }

      if (!this.fillTitle(id)) {
        // todo: add generic title
      }
      return this.fillBody(id);
    },

    buildFrame: function(id){
      this.winFrame = new Element('div', {
          'id': id + this.options.classSuffix + this.options.idSuffix,
          'class': this.options.className + this.options.classSuffix + ' ' + id.replace(/^([A-Za-z]*)_.*$/, this.options.className + '-$1'),
          'styles': {
            'position': 'absolute',
            'top': '0',
            'left': '0'
          }
        });
    },

    show: function(event_){
      // raise before determining the position, as we then have the true
      // window dimensions derived from CSS settings for rectification
      // (instead of just some magic constants)
      this.wm.raise(this);
      if (event_) this.position(event_);
      if (this.winFrame.style.position != 'fixed') {
        // floating coordinates refer to the 'content' element
        content = document.getElementById('content');
        contentRect = content.getBoundingClientRect();
        this.winFrame.style.position = "absolute";
        this.winFrame.style.left = (parseInt(this.winFrame.style.left) - contentRect.left + content.scrollLeft) + 'px';
        this.winFrame.style.top  = (parseInt(this.winFrame.style.top)  - contentRect.top  + content.scrollTop ) + 'px';
      }
      this.fireEvent('onShow', [this.winFrame]);
      if (this.options.timeout)
        this.timer = this.hide.delay(this.options.timeout, this);
      return false;
    },

    hide: function(){
      this.fireEvent('onHide', [this.winFrame]);
      if (this.options.destroyOnHide) {
        this.wm.unregister(this);
        for (var z in this) this[z] = null;
        this.destroyed = true;
      }
      else {
        if (this.winFrame.style.position == 'fixed') {
            // floating coordinates refer to the 'content' element
            content = document.getElementById('content');
            contentRect = content.getBoundingClientRect();
            this.winFrame.style.position = "absolute";
            this.winFrame.style.left = (winFrameRect.left - contentRect.left + content.scrollLeft) + 'px';
            this.winFrame.style.top  = (winFrameRect.top  - contentRect.top  + content.scrollTop ) + 'px';
            this.pinButton.src = this.options.pinImg;
        }
        this.wm.bury(this);
      }
      return false;
    },

    fillBody: function(id_select_html_elements, epgid){
      if (!epgid) return false;
      var bodyElems = $$('#'+ id_select_html_elements + ' ' + this.options.bodySelect);
      if ((bodyElems != undefined) && bodyElems.length > 0) {
        this.winBody.empty();
        this.fireEvent('onDomExtend', [id_select_html_elements, bodyElems]);
        this.winBody.adopt(bodyElems);
        var history_num_back = 0;
        var history_back = this.winBody.getElementById('history_' + id_select_html_elements);
        if (history_back) {
          history_num_back = Number(history_back.value);
        }
        var confirm_ = this.winBody.getElementById('confirm_' + id_select_html_elements);
        if (confirm_) {
          confirm_.onclick = null;
          confirm_.addEvent('click', async function(event) {
              disable_popup_if_user_checked(id_select_html_elements, epgid);
              await action(epgid);
              if (history_num_back > 0) { history.go(-history_num_back); }
              else { location.reload(); }
              var event_;
              if (MooTools.version == '1.11') {
                event_ = new Event(event);
              } else {
                event_ = new DOMEvent(event);
              }
              event_.stop();
              return this.hide();
            }.bind(this));
        }
        var close_button = this.winBody.getElementById('close_' + id_select_html_elements);
        if (close_button) {
          close_button.onclick = null;
          close_button.addEvent('click', function(event) {
              var event_;
              if (MooTools.version == '1.11') {
                event_ = new Event(event);
              } else {
                event_ = new DOMEvent(event);
              }
              event_.stop();
              return this.hide();
            }.bind(this));
        }
        var firstScript = bodyElems.getElement('script.injectIcons');
        if (firstScript && firstScript.length && firstScript[0]) {
          var js_m = new Element('div').adopt(firstScript).firstChild.textContent;
          eval(js_m);
        }
        return true;
      }
      return false;
    },

    fillTitle: function(id_select_html_elements){
      var titleElems = $$('#' + id_select_html_elements + ' ' + this.options.titleSelect);
      if ((titleElems != undefined) && titleElems.length > 0) {
        this.titleBox.empty().adopt(titleElems);
        return true;
      }
      return false;
    },

    position: function(event){
      var prop = {'x': 'left', 'y': 'top'};
      var posx;
      var posy;
      if (MooTools.version == '1.11') {
        posx = event.page['x'];
        posy = event.page['y'];
      } else {
        event_ = new DOMEvent(event);
        posx = event_.page['x'];
        posy = event_.page['y'];
      }
      posy += this.options.offsets['y'];
      content = document.getElementById('content');
      contentRect = content.getBoundingClientRect();
      if (posy < contentRect.y) posy = contentRect.y;
      this.winFrame.setStyle(prop['y'], posy);
      posx += this.options.offsets['x'];
      var width = this.winFrame.getBoundingClientRect().width;
      if (posx > window.innerWidth - width) posx = window.innerWidth - width;
      if (posx < 1) posx = 1;
      this.winFrame.setStyle(prop['x'], posx);
    }
  });

InfoWin.implement(new Events, new Options);

/*
Class: InfoWin.Manager
  Provide an container and events for the created info win
  instances.  Closed info-wins are preserved in a hidden DOM element
  and used again if a window with a closed id is opened again.
*/
InfoWin.Manager = new Class({
    Implements: [Options],
    options: {
      closedContainer: 'infowin-closed',
      openedContainer: 'infowin-opened',
      onRegister: Class.empty,
      onUnregister: Class.empty,
      onRaise: Class.empty,
      onBury: Class.empty
    },

    initialize: function(options){
      this.setOptions(options);
      // initialize properties this.closedWins and this.openedWins:
      ['closed', 'opened'].each(function(kind){
          var wins = kind + 'Wins';
          var opts = this.options[kind + 'Container'];
          this[wins] = $(opts);
          if (this[wins] == undefined){
            this[wins] = new Element('div', {
                'id': opts,
                'styles' : {
                  'display' : (kind == 'closed') ? 'none' : 'block'
                }
              });
            this[wins].inject(document.getElementById('content') || document.body);
          }
        }, this);
    },

    register: function(infoWin){
      this.fireEvent('onRegister', [infoWin]);
      infoWin.winFrame.addEvent('click', function(){
          this.raise(infoWin);
        }.bind(this));
      infoWin.winFrame.inject(this.closedWins);
    },

    unregister: function(infoWin){
      this.fireEvent('onUnregister', [infoWin]);
      infoWin.winFrame.remove();
    },

    raise: function(infoWin){
      this.fireEvent('onRaise', [infoWin]);
      infoWin.winFrame.inject(this.openedWins);
    },

    bury: function(infoWin){
      this.fireEvent('onBury', [infoWin]);
      infoWin.winFrame.inject(this.closedWins);
    }
  });

InfoWin.Manager.implement(new Events, new Options);

InfoWin.$wm = null;
window.addEvent('domready', function(){
    InfoWin.$wm = new InfoWin.Manager();
  });

/*
Class: InfoWin_Ajax

  Asynchronously request the content of an info win using fetch
*/
function is_digit(c){
  if (c >= '0' && c <= '9') {
    return true;
  } else {
    return false;
  }
}
/*  cyrb53 (c) 2018 bryc (github.com/bryc)
 *  License: Public domain (or MIT if needed). Attribution appreciated.
 *  A fast and simple 53-bit string hash function with decent collision resistance.
 *  Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
*/
const cyrb53 = function(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for(let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/*
*     cyrb53a beta (c) 2023 bryc (github.com/bryc)
*     License: Public domain (or MIT if needed). Attribution appreciated.
*     This is a work-in-progress, and changes to the algorithm are expected.
*     The original cyrb53 has a slight mixing bias in the low bits of h1.
*     This doesn't affect collision rate, but I want to try to improve it.
*     This new version has preliminary improvements in avalanche behavior.
* */
const cyrb53a_beta = function(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for(let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x85ebca77);
    h2 = Math.imul(h2 ^ ch, 0xc2b2ae3d);
  }
  h1 ^= Math.imul(h1 ^ (h2 >>> 15), 0x735a2d97);
  h2 ^= Math.imul(h2 ^ (h1 >>> 15), 0xcaf649a9);
  h1 ^= h2 >>> 16; h2 ^= h1 >>> 16;
  return 2097152 * (h2 >>> 0) + (h1 >>> 11);
};

function decrease_history_num_back(url) {
var ind_history = url.indexOf("history_num_back=");
if (ind_history == -1) return url;
ind_history += 17;
for (var ind_history_e = ind_history; ind_history_e < url.length && is_digit(url.substring(ind_history_e, ind_history_e+1)); ++ind_history_e);
if (ind_history_e <= ind_history) return url;
var history_num_back = Number(url.substring(ind_history, ind_history_e))-1;
if (history_num_back < 0) return url;
return url.substring(0, ind_history) + history_num_back + url.substring(ind_history_e);
}

// var InfoWin_Ajax = new Class({
//  Extends: InfoWin,
InfoWin_Ajax = InfoWin.extend({
  options: {
    loadingMsg: 'loading',
    errorMsg: 'an error occurred!',
    onError: Class.empty
  },

  get_content: async function(epgid, url) {
    if (!this.get_content_0(epgid, url)) {
      console.log('Error fetching url '+url);
      this.titleBox.innerHTML = 'Error fetching url '+url;
    }
  },
  get_content_0: async function(epgid, url) {
    var response = await fetch(url);
    if (!response) return false;
    var text = await response.text();
    if (!text) return false;
    var id_select_html_elements;
    var found = /<input type="hidden" name="id_select_html_elements" value="(\w+)"/.exec(text);
    if ((found != undefined) && found.length > 1) {
      id_select_html_elements = found[1];
    } else {
      id_select_html_elements = epgid;
    }
//  console.log("id_select_html_elements  = "+id_select_html_elements+" epgid = "+epgid);
    this.ajaxResponse.innerHTML = text;
    this.fillTitle(id_select_html_elements);
    this.fillBody(id_select_html_elements, epgid);
    this.ajaxResponse.remove();
    return true;
  },
  initialize: function(epgid, url_in, options){
// id: id for this infowin
    let id = 'A' + cyrb53(epgid);
    this.parent(id, options);
    var url = decrease_history_num_back(url_in)+'&async=1';
    if (this.ajaxResponse != undefined) {
      this.get_content(epgid, url);
    }
  },

  // this function gets called when no previous instance for 'id'
  // created a DOM subtree for an infowin.
  build: function(id){
    if (!this.parent(id)) {
      this.titleBox.setHTML(this.options.loadingMsg);
      this.ajaxResponse = new Element('div', {
          'styles' : {
            'display': 'none'
          }
        }).inject(this.winFrame);
    }
  }
});


/*
Class: Infowin.Notifier

Creates a notification popup that disappears automatically.
Useful for a confirmation message after a AJAX action request.
*/

InfoWin.Notifier = InfoWin.extend({
  options: {
    timeout: 2500,
    destroyOnHide: true,
    className: 'ok',
    classSuffix: '-info',
    message: '',
    offsets: {'x': 16, 'y': 16}
  },

  initialize: function(id, options){
    this.parent(id, options);
  },

  build: function(id){
    /* body of tip: some helper divs and content */
    this.winBody = new Element('div', {
        'class': this.options.className + this.options.classSuffix + '-body'
      }).inject(this.winFrame);
    return this.fillBody(id);
  },

  fillBody: function(id){
    this.winFrame.setStyle('position', 'fixed');
    this.winBody.empty().setHTML(this.options.message);
    return true;
  },

  position: function(event){
    var prop = {'x': 'left', 'y': 'top'};
    for (var z in prop) {
      var pos = this.options.offsets[z];
      this.winFrame.setStyle(prop[z], pos);
    }
  }
});

// the following functions are generally needed to show the about box
// as window; without them a new page will be opened all the time

function get_disable_popup_storage_name(id) {
if (id.endsWith('_') ) {
  return "disable_popup_" + id.substring(0, 3) + "_ms";   // ms for multiple selection
} else {
  return "disable_popup_" + id.substring(0, 3);
}
}

function is_popup_disabled(id) {
let storage_name = get_disable_popup_storage_name(id);
let c = sessionStorage.getItem(storage_name);
if (c && c == '1') return true;
const el = document.querySelector("div");
let cs = getComputedStyle(el).getPropertyValue("--" + storage_name);
  return cs && cs == '1';
}

function disable_popup(id) {
  sessionStorage.setItem(get_disable_popup_storage_name(id), '1');
}
