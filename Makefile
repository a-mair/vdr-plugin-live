#
# Makefile for the 'LIVE' Video Disk Recorder plugin
#

# The official name of this plugin.
# This name will be used in the '-P...' option of VDR to load the plugin.
# By default the main source file also carries this name.
PLUGIN := live

### The version number of this plugin (taken from the main source file):
HASH := \#
ifeq ($(VERSION),)
  VERSION := $(shell awk '/$(HASH)define LIVEVERSION/ { print $$3 }' setup.h | sed -e 's/[";]//g')
endif

# figure out VERSION_SUFFIX
ifeq ($(VERSION_SUFFIX),)
  ifneq ($(shell which git),)
    ifeq ($(shell test -d .git || echo void),)
      VERS_B := $(shell git branch | grep '^*' | sed -e's/^* //')
      VERS_H := $(shell git show --pretty=format:"%h_%ci" HEAD | head -1 | tr -d ' \-:')
      VERS_P := $(shell git status -uno --porcelain | grep -qc . && echo "_patched")
      VERSION_SUFFIX += _git_$(VERS_B)_$(VERS_H)$(VERS_P)
    endif
  endif
  ifneq ($(shell which quilt),)
    ifeq ($(shell quilt applied 2>&1 > /dev/null; echo $$?),0)
      VERSION_SUFFIX += _quilt_$(shell quilt applied | tr  '\n' '_')
    endif
  endif
# $(info VERSION_SUFFIX = "$(VERSION_SUFFIX)")
endif


ifdef PKG_CONFIG
  PKG_CONFIG := $(PKG_CONFIG)
else
  PKG_CONFIG := pkg-config
endif

### The directory environment:
# Use package data if installed...otherwise assume we're under the VDR source directory:
PKGCFG = $(if $(VDRDIR),$(shell $(PKG_CONFIG) --variable=$(1) $(VDRDIR)/vdr.pc),$(shell PKG_CONFIG_PATH="$$PKG_CONFIG_PATH:../../.." $(PKG_CONFIG) --variable=$(1) vdr))
LIBDIR := $(call PKGCFG,libdir)
LOCDIR := $(call PKGCFG,locdir)
CFGDIR := $(call PKGCFG,configdir)
PLGCFG := $(call PKGCFG,plgcfg)
RESDIR := $(call PKGCFG,resdir)
#
ifdef TMPDIR
  TMPDIR := $(TMPDIR)
else
  TMPDIR := /tmp
endif

### The compiler options:
export CFLAGS   := $(call PKGCFG,cflags)
export CXXFLAGS := $(call PKGCFG,cxxflags)

ifdef ECPPC
  ECPPC := $(ECPPC)
else
  ECPPC := ecppc
endif

### The version number of VDR's plugin API:
APIVERSION := $(call PKGCFG,apiversion)

### Allow user defined options to overwrite defaults:
-include $(PLGCFG)

include global.mk

### Determine tntnet and cxxtools versions:
TNTNET-CONFIG := $(shell which tntnet-config 2>/dev/null)
ifeq ($(TNTNET-CONFIG),)
TNTNET_VERSION = $(shell $(PKG_CONFIG) --modversion tntnet)
CXXFLAGS  += $(shell $(PKG_CONFIG) --cflags tntnet)
LIBS      += $(shell $(PKG_CONFIG) --libs tntnet)
else
TNTNET_VERSION = $(shell tntnet-config --version)
CXXFLAGS  += $(shell tntnet-config --cxxflags)
LIBS      += $(shell tntnet-config --libs)
endif

TNTVERSION = $(shell echo $(TNTNET_VERSION) | sed -e's/\.//g' | sed -e's/pre.*//g' | awk '/^..$$/ { print $$1."000"} /^...$$/ { print $$1."00"} /^....$$/ { print $$1."0" } /^.....$$/ { print $$1 }')
# $(info $$TNTVERSION is [${TNTVERSION}])

CXXTOOL-CONFIG := $(shell which cxxtools-config 2>/dev/null)
ifeq ($(CXXTOOL-CONFIG),)
CXXTOOLS_VERSION = $(shell $(PKG_CONFIG) --modversion cxxtools)
else
CXXTOOLS_VERSION = $(shell cxxtools-config --version)
endif

CXXTOOLVER := $(shell echo $(CXXTOOLS_VERSION) | sed -e's/\.//g' | sed -e's/pre.*//g' | awk '/^..$$/ { print $$1."000"} /^...$$/ { print $$1."00"} /^....$$/ { print $$1."0" } /^.....$$/ { print $$1 }')

# Project specific compiler flags

# For rough image scaling
LIBS += -ljpeg

CXXFLAGS += -std=c++17 -Wfatal-errors -Wundef

INCLUDES_PAGES += -I$(VDRDIR)/include -I. -I.. -I../live/img
ECPPINCLUDES += -I. -Ipages -Ilive/img

### Includes and Defines (add further entries here):
DEFINES	+= -D_GNU_SOURCE -DPLUGIN_NAME_I18N='"$(PLUGIN)"' -DTNTVERSION=$(TNTVERSION) -DCXXTOOLVER=$(CXXTOOLVER)
DEFINES	+= -DDISABLE_TEMPLATES_COLLIDING_WITH_STL
DEFINES	+= -DVERSION_SUFFIX='"$(VERSION_SUFFIX)"'

### Optional configuration features
PLUGINFEATURES :=

### export all vars for sub-makes, using absolute paths
LIBDIR := $(abspath $(LIBDIR))
LOCDIR := $(abspath $(LOCDIR))

### The name of the distribution archive:
ARCHIVE := $(PLUGIN)-$(VERSION)
PACKAGE := vdr-$(ARCHIVE)

### The name of the shared object file:
SOFILE := libvdr-$(PLUGIN).so

### Installed shared object file:
SOINST := $(DESTDIR)$(LIBDIR)/$(SOFILE).$(APIVERSION)

### The object files (add further files here):
PLUGINSRCS := $(wildcard *.cpp)
PLUGINOBJS := $(PLUGINSRCS:.cpp=.o)

### The pages object files (add further files here):
EPAGESRCS := $(wildcard pages/*.ecpp)
PAGESRCS  := $(EPAGESRCS:.ecpp=.cpp)
PAGESOBJS := $(PAGESRCS:.cpp=.o)

EPAGESRCS_DEPS := $(patsubst %.o,.%.edep,$(PAGESOBJS))

### Internationalization (I18N):
PODIR    := po
I18Npo   := $(wildcard $(PODIR)/*.po)
I18Nmo   := $(addsuffix .mo, $(foreach file, $(I18Npo), $(basename $(file))))
I18Nmsgs := $(addprefix $(DESTDIR)$(LOCDIR)/, $(addsuffix /LC_MESSAGES/vdr-$(PLUGIN).mo, $(notdir $(foreach file, $(I18Npo), $(basename $(file))))))
I18Npot  := $(PODIR)/$(PLUGIN).pot
I18Npot_deps := $(PLUGINSRCS) $(PAGESRCS) setup.h epg_events.h confirm.h

### The main target:
.PHONY: all
all: print-versions sofile i18n
	@true

### Implicit rules:
pages/%.edep: pages/%.ecpp
	$(call PRETTY_PRINT,"EC" $@)
	@$(ECPPC) -M $(ECPPFLAGS) $(ECPPFLAGS_CPP) $(ECPPINCLUDES) $< > $@

pages/%.cpp: pages/%.ecpp
	$(call PRETTY_PRINT,"EC" $@)
	$(Q)$(ECPPC) $(ECPPFLAGS) $(ECPPFLAGS_CPP) $(ECPPINCLUDES) -o $@ $<

%.o: %.cpp
	$(call PRETTY_PRINT,"CC" $@)
	$(Q)$(CXX) $(CXXFLAGS) -c $(DEFINES) $(PLUGINFEATURES) $(INCLUDES) $(INCLUDES_PAGES) -o $@ $<

### Dependencies:
MAKEDEP := $(CXX) -MM -MG
.dependencies: Makefile $(PAGESRCS) $(EPAGESRCS)
	@$(MAKEDEP) $(CXXFLAGS) $(DEFINES) $(PLUGINFEATURES) $(INCLUDES) $(PLUGINSRCS) $(PAGESRCS) > $@

ifneq ($(MAKECMDGOALS),clean)
-include .dependencies
-include $(EPAGESRCS_DEPS)
endif

$(I18Npot): $(I18Npot_deps)
	$(call PRETTY_PRINT,"GT" $@)
	$(Q)xgettext -C -cTRANSLATORS --no-wrap --no-location -k -ktr -ktrNOOP --package-name=VDR-LIVE --package-version=$(VERSION) -o $@ $(I18Npot_deps)

.PHONY: I18Nmo
I18Nmo: $(I18Nmo)
	@true

%.mo: %.po
	$(if $(DISABLE_I18Nmo_txt),,@echo "Creating *.mo")
	@msgfmt -c -o $@ $<
	$(eval DISABLE_I18Nmo_txt := 1)

%.po: $(I18Npot)
	$(if $(DISABLE_I18Npo_txt),,@echo "Creating *.po")
	@msgmerge -U --no-wrap --no-location --backup=none -q -N $@ $<
	@touch $@
	$(eval DISABLE_I18Npo_txt := 1)

$(I18Nmsgs): $(DESTDIR)$(LOCDIR)/%/LC_MESSAGES/vdr-$(PLUGIN).mo: $(PODIR)/%.mo
	$(if $(DISABLE_I18Nmoinst_txt),,@echo "Installing *.mo")
	@install -D -m644 $< $@
	$(eval DISABLE_I18Nmoinst_txt := 1)

.PHONY: inst_I18Nmsg
inst_I18Nmsg: $(I18Nmsgs)
	@true

.PHONY: i18n
i18n: I18Nmo

.PHONY: install-i18n
install-i18n: print-versions i18n inst_I18Nmsg

### Targets:

pages/libpages.a: $(PAGESOBJS)
	$(call PRETTY_PRINT,"AR pages/" $@)
	$(AR) r $@ $^

$(SOFILE): $(PLUGINOBJS) $(PAGESOBJS)
	$(call PRETTY_PRINT,"LD" $@)
	$(Q)$(CXX) $(CXXFLAGS) $(LDFLAGS) -shared $(PLUGINOBJS) -Wl,--whole-archive $(PAGESOBJS) -Wl,--no-whole-archive $(LIBS) -o $@

.PHONY: sofile
sofile: $(SOFILE)
	@true

.PHONY: install-so
install-so: $(SOINST)

$(SOINST): $(SOFILE)
	$(call PRETTY_PRINT,"Installing" $<)
	$(Q) install -D $< $@

.PHONY: print-versions
print-versions:
	@echo "VERSION is $(VERSION)"
	@echo "VERSION_SUFFIX = \"$(VERSION_SUFFIX)\""
	@echo "TNTNET_VERSION is ${TNTNET_VERSION}, adding \"-DTNTVERSION=$(TNTVERSION)\""
	@echo "CXXTOOLS_VERSION is ${CXXTOOLS_VERSION}, adding \"-DCXXTOOLVER=$(CXXTOOLVER)\""

.PHONY: install-web
install-web: print-versions
	@mkdir -p $(DESTDIR)$(RESDIR)/plugins/$(PLUGIN)
	@cp -a live/* $(DESTDIR)$(RESDIR)/plugins/$(PLUGIN)/

.PHONY: install-conf
install-conf: print-versions
	mkdir -p $(DESTDIR)$(CFGDIR)/plugins/$(PLUGIN)
	@for i in conf/*; do\
	    if ! [ -e $(DESTDIR)$(CFGDIR)/plugins/$(PLUGIN)/$$i ] ; then\
	        cp -p $$i $(DESTDIR)$(CFGDIR)/plugins/$(PLUGIN);\
	    fi;\
	done

.PHONY: install
install: install-so install-i18n install-web install-conf

.PHONY: dist
dist: $(I18Npo)
	$(call PRETTY_PRINT,"make dist")
	$(MAKE) --no-print-directory clean
	@-rm -rf $(TMPDIR)/$(ARCHIVE)
	@mkdir $(TMPDIR)/$(ARCHIVE)
	@cp -a * $(TMPDIR)/$(ARCHIVE)
	@tar czf $(TMPDIR)/$(PACKAGE).tar.gz -C $(TMPDIR) $(ARCHIVE)
	@-rm -rf $(TMPDIR)/$(ARCHIVE)
	@echo Distribution package created as $(TMPDIR)/$(PACKAGE).tar.gz

.PHONY: clean
clean:
	$(call PRETTY_PRINT,"CLN")
	@-rm -f $(I18Nmo) $(I18Npot)
	@-rm -f $(PLUGINOBJS) .dependencies *.so *.tgz core* *~
	@-rm -f $(PAGESRCS) $(PAGESOBJS) pages/.*.edep

.PRECIOUS: $(I18Npo)

