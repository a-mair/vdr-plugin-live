/*
 * This is part of the live VDR plugin. See COPYING for license information.
 *
 * PageEnhance class.
 *
 * This class applies several functions to the page based on
 * selectors. This class is project dependent and not a general
 * purpose class.
 */

var PageEnhance = new Class({
    Implements: [Options],
    options: {
      epgLinkSelector: 'a[href^="epginfo.html?epgid"], *[xlink:href="epginfo.html?epgid=rcKeys"]',
      actionLinkSelector: 'a[href^="vdr_request/"]',
      hintTipSelector: '*[title], *[xlink:title]',
      hintClassName: 'hint',
      infoWinOptions: {
        bodySelect: 'div.epg_content',
        loadingMsg: 'loading',
        errorMsg: 'an error occurred!'
      },
      notifyIdPrefix: 'notify',
      notifyStrings: {
        successMsg: '<img class="icon" src="active.svg" alt=""> Success!',
        errorMsg: '<img lass="icon" src="del.svg" alt=""> failed!'
      }
    },

    initialize: function(options){
      this.setOptions(options);
      this.$notifyCount = 0;
      window.addEvent('domready', this.domReadySetup.bind(this));
      window.addEvent('mousedown', this.mouseDownSetup.bind(this));
    },

    // actions applied on domready to the page.
    domReadySetup: function(){
      $$(this.options.epgLinkSelector).each(this.epgPopup.bind(this));
      this.addHintTips($$(this.options.hintTipSelector));
      $$(this.options.actionLinkSelector).each(this.vdrRequest.bind(this));
    },

    // actions applied on mouse down.
    mouseDownSetup: function(){
      $$('.' + this.options.hintClassName + '-tip').setStyle('visibility', 'hidden');
    },

    // registered as 'onDomExtend' event for InfoWin. Takes care to
    // enhance the new DOM elements, too.
    domExtend: function(id, elems){
      var sel = '#' + id + ' ' + this.options.hintTipSelector;
      elems = $$(sel);
      this.addHintTips(elems);
      $$('#' + id + ' ' + this.options.actionLinkSelector).each(this.vdrRequest.bind(this));
    },

    // EPG popup function. Apply to all elements that should
    // pop up an EPG InfowWin window.
    epgPopup: function(el){
      var href = el.href;
      // xlink:href returns an animation object
      if (typeof(href) === 'object') {
        href = href.baseVal ?? "";
      }
      if (href != undefined && href != "") {
        var found = /epgid=(\w+)/.exec(href);
        if ((found != undefined) && found.length > 1) {
          var epgid = found[1];
          el.addEvent('click', async function(event){
            var event_;
            if (MooTools.version == '1.11') {
              event_ = new Event(event);
            } else {
              event_ = new DOMEvent(event);
            }
            if (epgid.length > 4 && is_popup_disabled(epgid)) {
              event_.stop();
              await action(epgid);
              location.reload();
              return false;
            }
            if (window.matchMedia("(max-width: 600px)").matches) {
              location.replace(href);
              return true;
            }
            var merged_options;
            var infowin;
            if (MooTools.version == '1.11') {
              merged_options = $merge(this.options.infoWinOptions, {
                              onDomExtend: this.domExtend.bind(this) });
              infowin = new InfoWin_Ajax(epgid, href, merged_options);
            } else {
              merged_options = Object.merge(this.options.infoWinOptions, {
                              onDomExtend: this.domExtend.bind(this) });
              infowin = new InfoWin_Ajax(epgid, href, merged_options);
//            infowin.initialize(epgid, href, merged_options);
            }
            console.log("epgPopup, href = "+href+" epgid = "+epgid);
            infowin.show(event_);
            event_.stop();
            return false;
          }.bind(this));
        }
      }
    },

    // function that requests an action from the server VDR.
    vdrRequest_fetch: async function(href, event){
      try {
        const response = await fetch(href + '&async=1');
        var xmldoc = new window.DOMParser().parseFromString(await response.text(), "text/xml");
        var success = xmldoc.getElementsByTagName('response').item(0).firstChild.nodeValue;
        new InfoWin.Notifier(this.options.notifyIdPrefix + this.$notifyCount, {
            className: success == '1' ? 'ok' : 'err',
            message: success == '1' ? this.options.notifyStrings.successMsg : this.options.notifyStrings.errorMsg
          }).show(event);
      } catch(e) {
        console.log("Error in vdrRequest_fetch: "+e.message);
      }
    },
    vdrRequest: function(el){
      el.addEvent('click', function(element, event){
        if (element.href != undefined && element.href != "") {
          var event_
          if (MooTools.version == '1.11') {
            event_ = new Event(event);
          } else {
            event_ = new DOMEvent(event);
          }
          event_.stop();
          this.$notifyCount++;
          this.vdrRequest_fetch(element.href, event_);
          return false;
        }
        return true;
      }.bind(this, el));
//    }.bindWithEvent(this, el));
// https://stackoverflow.com/questions/4259938/bindwithevent-mootools-1-3
// The simplest solution is to reverse arguments in the method :) so if you have method like this
// because event is always the last argument.
//
//  bindWithEvent: function(bind, args){
//        return this.create({'bind': bind, 'arguments': args, 'event': Event});
    },

    // change normal 'title'-Attributes into enhanced hinttips
    // used by domExtend and domReadySetup functions.
    addHintTips: function(elems) {
      if (window.matchMedia("(hover: none)").matches) {
      elems_use = elems.filter(
        function(item, index){ return !item.hasClass('apopup'); }
        );
          } else {
            elems_use = elems;
           }
      if (this.tips == undefined) {
        this.tips = new HintTips(elems_use, {
            maxTitleChars: 100,
            className: this.options.hintClassName
          });
      }
      else {
        $$(elems_use).each(this.tips.build, this.tips);
      }
    }
  });

PageEnhance.implement(new Events, new Options);
