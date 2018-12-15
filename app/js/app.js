jQuery.expr[':'].icontains = function(a, i, m) {
  return jQuery(a).text().toUpperCase()
      .indexOf(m[3].toUpperCase()) >= 0;
};

PENTAHO_URL = "/pentaho/Xmla";
MEASURE_MEASURE = 0
VARIACAO_MEASURE = 1
TENDENCIA_MEASURE = 2
var currentFiltersGlobal = [];
function getColumns(row, query) {
    var offset = query.level || 0;
    var offsetMeasures = 0;
    var add = 0;
    if( query.dimension.additionalMeasures) {
        offsetMeasures = query.dimension.additionalMeasures.length;
    }

    if(row && (row.length - offsetMeasures - offset) >= 6) {
        add = 1
    }

    // Tamanho de rows de consulta normal
    extra_captions = []
    for (var i = 0; i < offset; i++) {
        extra_captions.push(i);
    }

    hasDrillDown = false;
    if (query.drillDownCurrent || query.dimension.drillDownBy) {
        hasDrillDown = true;
    }

    minusMeasure = !query.dimension.visualizationOptions.showDataBar;
    minusVariacao = !query.dimension.visualizationOptions.showYearlyVariation;
    minusTendencia = !query.dimension.visualizationOptions.showTrendLine;
    measureidx = 2;
    if(query.dimension.additionalMeasures) {
        if (hasDrillDown) {
            measureidx = 2 
        } else if(row && row.length >= 5 && $.type(row[2]) === "string") {
            measureidx = 2 + row.length - 4
        }
    }
    if(hasDrillDown) {
        ret_measure = measureidx + offset
        // console.log('offset is', offset)
    } else {
        ret_measure = measureidx + offset + add

    }
    return {CAPTION: 0+offset+add,
            NAME: 1+offset+add,
            MEASURE: ret_measure,
            VARIACAO: 3+offset - minusMeasure + offsetMeasures + add,
            TENDENCIA: 4+offset - minusVariacao - minusMeasure + offsetMeasures + add,
            EXTRA_CAPTIONS: extra_captions};
}

function preprocessNumber(number) {
    if (number != null) {
        try {
            preprocessed = parseFloat(number);
            return preprocessed;
        } catch(err) {
            return 0;
        }
    }
    return 0;
}

// Get string parameter
var GET = {};
if (location.search) {
    var parts = location.search.substring(1).split('&');

    for (var i = 0; i < parts.length; i++) {
        var nv = parts[i].split('=');
        if (!nv[0]) continue;
        GET[nv[0]] = decodeURIComponent(nv[1]) || true;
    }
}

var tabs = null;
var semaphoreGlobalFilter  = 0, all_queued_global_filter = false;
var semaphoreDimensions  = 0, all_queued_dimensions = false;
var global_filters = null;
var sidemenu = null;
if(GET.startdate) {
    var start = moment(GET.startdate, "YYYYMMDD")
} else {
    var start = moment().startOf('month');
}

if(GET.enddate) {
    var end = moment(GET.enddate, "YYYYMMDD")
} else {
    var end = moment();
}
// start.format('YMMDD')
// moment("12-25-1995", "MM-DD-YYYY");

// http://177.135.142.133:8010/pentaho/Home usuário `bi` senha `260788spd`
// "target": "http://177.135.142.133:8010/pentaho"
//
// "target": "http://h-pbis-01.do.veltio.com.br/pentaho/"

// "target": "http://177.38.243.154:4501/pentaho/"

// 177.38.243.154:4501/pentaho/Home
// usuário `sghi` senha `bi260788`

console.log(GET);
if(GET.path) {
    jsonURL = '/pentaho/api/repo/files/{path}'.formatParams({'path': GET.path})
} else {
    d = GET.d || 'ovvt';
    jsonURL = '/pentaho/plugin/ppa/api/dashmd?paramd={d}'.formatParams({'d': d});
}
postRefreshFn = null;
postRenderFn = null;
amount_refreshes = 0
start_tab_key = 0
if (GET.st){
    start_tab_key = GET.st
}

// console.log(jsonURL)
if (GET.debug){
    $.get( "today.json", loadDash)
} else {
    $.getJSON(jsonURL, loadDash)
}
function loadDash(data) {
    console.log('dash');
    if (data.postRefreshFn) {
        postRefreshFn = eval(data.postRefreshFn)
    }

    if (data.postRenderFn) {
        postRenderFn = eval(data.postRenderFn)
    }

    tabs = data.tabs;
    global_filters = data.filters;
    sidemenu = data.sideMenu;
    if(data.dashOptions && data.dashOptions.startDateRangeMonthSubtract) {
        start = moment().subtract(data.dashOptions.startDateRangeMonthSubtract, 'month').startOf('month');
        end = moment().subtract(data.dashOptions.startDateRangeMonthSubtract, 'month').endOf('month');
    }
    
    if(data.dashOptions && data.dashOptions.startDateRangeDaySubtract) {
        end = end.subtract(data.dashOptions.startDateRangeDaySubtract, 'day')
    }
    
    
    for (var key in global_filters) {
        var global_filter = global_filters[key];
        if(GET[global_filter.name]) {
            global_filter.initialValue.olapDimMember = GET[global_filter.name];
            console.log('Using GET global filter: ' + global_filter.initialValue.olapDimMember);
        }
    }
    buildTabs(tabs, global_filters);
    try {
        buildAnchors(data.dashOptions.links, global_filters);
    } catch(err) {
        console.log('no anchor links defined', err);
    }
    if(data.dashOptions && data.dashOptions.refreshTime) {
        setInterval(reload, data.dashOptions.refreshTime*1000);
    }

}
// download | newType | -> null é modal
function buildAnchors(links, global_filters) {
    $target = $('#app');
    $target.append('<div id="anchor-div"></div>')
    $target = $('#anchor-div')
    for (var link_key in links) {
        var link = links[link_key];

        url = link.anchorUrl;
        
        var indices = [];
        for(var i=0; i<url.length;i++) {
            if (url[i] === "*") indices.push(i);
        }
        for (var i = indices.length - 1; i >= 2; i--) {
            try {
                var global_filter = global_filters[i-2];
            } catch(err) {
                continue
            }
            var dimMember = $('#'+global_filter.name).find('option:selected:not([value="nofilter_true"])').val();
            url = url.removeAt(indices[i], 1);

            if(dimMember)
                url = url.insert(indices[i], escape(dimMember));
        }
        if(indices.length >= 2) {
            url = url.removeAt(indices[1], 1);
            url = url.insert(indices[1], escape(start.format('YMMDD')));

            url = url.removeAt(indices[0], 1);
            url = url.insert(indices[0], escape(end.format('YMMDD')));
        }
        if (link.type == "download") {
            $target.append('<a href='+url+' class="anchor" download>'+link.caption+'</a>')

        } else if(link.type == "newTab") {
            $target.append('<a href='+url+' class="anchor" target="_blank">'+link.caption+'</a>')
        } else {
            $target.append('<a href="javascript:void(0)" anchorUrl='+url+' class="anchor">'+link.caption+'</a>')
            $target.append(
            '<div class="modal fade" tabindex="-1" role="dialog" id="'+link.caption.clean()+'"> \
            <div class="modal-dialog modal-lg" role="document"> \
                <div class="modal-content"> \
                    <div class="modal-header"> \
                        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button> \
                    </div> \
                    <div class="modal-body"> \
                        <iframe src="" width="99.6%" frameborder="0"></iframe> \
                    </div> \
                </div> \
            </div> \
            </div>');
            $('.anchor').click(function() {
        
                $this = $(this)
                $('#'+$this.text().clean()).modal('show');
                $('#'+$this.text().clean()).on('shown.bs.modal', function () {
                    $iframe = $('#'+$this.text().clean() + ' iframe')
                    $iframe.attr("src", url);
                    $iframe.on('load', function() {
                        this.height = "";
        
                        this.height = $('.modal-content').height() - 45 + "px";
                    })
                });
            });
        }
    }

}

function initPopover($elem, currentRow, drillDownBy, idx, $drillDownData) {

    caption = currentRow[idx.CAPTION] ? currentRow[idx.CAPTION] : currentRow[idx.NAME];
    threedots = caption.length > 16 ? '...' : '';
    caption = caption.substring(0, 16);
    caption = 'Detalhamento - ' + caption + threedots;
    content = ''
    maxLevel = 0
    for (drill_key in drillDownBy) {
        drill = drillDownBy[drill_key];
        content += '<p><a class="popover-drill" href="javascript:void(0)">'+drill.caption+'</a></p>';
        maxLevel = drill.levels > maxLevel ? drill.levels : maxLevel;
    }
    currentLevel = $drillDownData.attr('level');
    if (currentLevel < maxLevel) {
        $elem.find('div:not(.no-popover)').popover({
            trigger: 'hover',
            title: caption,
            content: content,
            placement: 'top',
            html : true,
            delay: { "show": 200, "hide": 200 }
        });

    }
}

function reload() {
    var selected = $('.measure-selected');
    var measure_key = selected.attr('measure');
    var tab_key = selected.attr('tab');
    try {
        var measure = tabs[tab_key].measures[measure_key];
    } catch(err) {
        var measure = tabs[start_tab_key].measures[0];
    }
    filterArr = getDimensionFilters(measure).filterArr;
    updateMeasure({
        'tab_key': tab_key,
        'filter': filterArr.slice(0),
        'initial_measure_key': measure_key,
        'reloading': true
    });
}

function initDatePicker() {

    $('#reportrange').on('apply.daterangepicker', reload);

    function cb(start, end) {
        endFormat = 'DD [de] MMMM [de] YYYY';
        startFormat = 'DD'
        if(start.month() != end.month() && start.year() == end.year()) {
            startFormat += ' [de] MMMM';
        } else if(start.year() != end.year()) {
            startFormat += ' [de] MMMM';
            startFormat += ' [de] YYYY';
        }

        $('#reportrange span').html(start.format(startFormat) + ' a ' + end.format(endFormat));
    }
    $('#reportrange').daterangepicker({

        locale: {
            "applyLabel": "Aplicar",
            "cancelLabel": "Cancelar",
            "fromLabel": "De",
            "toLabel": "Até",
            "customRangeLabel": "Período Personalizado",
            "weekLabel": "Semana",
            "daysOfWeek": [
                "Dom",
                "Seg",
                "Ter",
                "Qua",
                "Qui",
                "Sex",
                "Sab"
            ],
            "monthNames": monthNames,
            "firstDay": 1
        },
        startDate: start,
        endDate: end,
        ranges: {
           thisMonth: [moment().startOf('month'), moment().endOf('month')],
           lastMonth: [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
           last3: [moment().subtract(3, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
           last12: [moment().subtract(12, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
           thisMonthLastYear: [moment().subtract(1, 'year').subtract(1, 'month').startOf('month'), moment().subtract(1, 'year').subtract(1, 'month').endOf('month')]
        },
        customRangeLabels: {
            thisMonth: monthNames[moment().month()],
            lastMonth: monthNames[moment().subtract(1, 'month').month()],
            last3: 'Os 3 Últimos Meses',
            last12: 'Os 12 Últimos Meses',
            thisMonthLastYear: monthNames[moment().subtract(1, 'month').month()]+'/'+moment().subtract(1, 'year').year(),
        },
        alwaysShowCalendars: true,
        opens: "left"

    }, cb);
    cb(start, end);

}

function breadcrumbNavigate () {
    selected = $('.measure-selected');
    measure_key = selected.attr('measure');
    tab_key = selected.attr('tab');
    dimension_key = $(this).attr('dimension');
    tab = tabs[tab_key];
    measure = tab.measures[measure_key];
    dimension = measure.dimensions[dimension_key];
    $dimensionData = $('#'+(tab.caption+measure.caption+dimension.caption).clean());
    selectedLevel = parseInt($(this).attr('level'));
    current = $dimensionData.attr('drilldowncurrent');

    // selectedLevel+1 because we are using 0-index, and the last +1 is to care care of the index of -> ]
    targetIndex = current.nthIndexOf('].', selectedLevel+1) + 1
    targetName = current.substring(0, targetIndex);
    $dimensionData.attr('level', selectedLevel);
    $dimensionData.attr('drilldowncurrent', targetName);

    currents = $dimensionData.find('.breadcrumb li').map(function(i, elem) {
        if (i > 0) return $(elem).text()
    });
    f = getDimensionFilters(measure, exclude=dimension_key, current=currents);

    filterArr = f.filterArr;
    excluded = f.excluded;

    updateTableWithDrillDown({
        'tab_key': tab_key,
        'measure_key': measure_key,
        'dimension_key': dimension_key,
        'dimensionName': '',
        'drillDownCurrent': targetName,
        'level': selectedLevel,
        'filter': filterArr.slice(0)
    });

    if(excluded) {
        updateMeasure({
            'tab_key': tab_key,
            'filter': currentFiltersGlobal.slice(0),
            'initial_measure_key': measure_key,
            'initial_dimension_key': dimension_key
        });
    }
}

function makeQuery(params) {
    crossjoin = 'NonEmptyCrossJoin'
    
    dimension = params.dimension || null;
    tab = params.tab || null;
    measure = params.measure || null;
    filteredWith = params.filteredWith || [];
    drillDown = params.drillDown || false;
    drillDownName = params.drillDownName || null;
    dimensionName = params.dimensionName || null;
    drillDownCurrent = params.drillDownCurrent || null;

    topclausule = '';
    selectComplement = '';
    mn = '';
    selectMn = '';

    if (drillDown) {
        filteredWith = filteredWith.filter(function(elem, index) {
            return elem.name != dimensionName
        })
        // console.log(drillDown)
        // console.log(filteredWith, dimensionName)
    }
    selectMainMeasure = 'Measures.[{olapMeasure}]'.formatParams({'olapMeasure': measure.olapMeasure});
    selectYearlyVariation = 'Measures.[Variacao]';
    selectTrendline = 'Measures.TendenciaU12M';

    select = [selectMainMeasure, selectYearlyVariation, selectTrendline].join(', ');

    if ($('#reportrange').length > 0) {
        startdate = $('#reportrange').data('daterangepicker').startDate;
        enddate = $('#reportrange').data('daterangepicker').endDate;
    } else {
        startdate = start.clone();
        enddate = end.clone();
    }

    // for dimension, either monthly or yearly
    startLastYear = startdate.clone().subtract(1, 'year');
    endLastYear = enddate.clone().subtract(1, 'year');

    if(dimension && dimension.visualizationOptions) {
        if(dimension.visualizationOptions.showMonthlyVariation) {
            dimension.visualizationOptions.showYearlyVariation = true
            startLastYear = startdate.clone().subtract(1, 'month');
            endLastYear = enddate.clone().subtract(1, 'month');
        } 
    } else if(measure && measure.visualizationOptions) {
        if(measure.visualizationOptions.showMonthlyVariation) {
            startLastYear = startdate.clone().subtract(1, 'month');
            endLastYear = enddate.clone().subtract(1, 'month');
        }
    }

    startU12 = enddate.clone().subtract(12, 'month').startOf('month');
    endU12 = enddate.clone().subtract(1, 'month').endOf('month');
    var u12Months = [];
    currentMonth = startU12.clone()
    while (currentMonth.isBefore(endU12)) {
      u12Months.push(currentMonth.clone());
      currentMonth = currentMonth.add(1, "month");
    };

    dateFilter = '[{dateDimension}].[{startyear}].[{startmonth}].[{startday}] : \
                        [{dateDimension}].[{endyear}].[{endmonth}].[{endday}]'.formatParams({
        'dateDimension': measure.dateDimension,
        'startyear': startdate.year(),'startmonth': startdate.month()+1,'startday': startdate.date(),
        'endyear': enddate.year(),'endmonth': enddate.month()+1,'endday': enddate.date()});

    where = 'where {{dateFilter}}'.formatParams({'dateFilter': dateFilter});

    if(dimension != null) {
        selectArr = []
        dim = '[{olapDimHierarchy}].[{olapDimLevel}].Members'.formatParams(
                        {'olapDimHierarchy': dimension.olapDimHierarchy, 'olapDimLevel': dimension.olapDimLevel});
        selectComplement = ', non empty Order({dim}, Measures.atual, BDESC) on 1'.formatParams({'dim': dim});
        if(dimension.visualizationType == 'table') {
            mn = ('member Measures.[mn] as [{olapDimHierarchy}].CurrentMember.Name').formatParams({'olapDimHierarchy': dimension.olapDimHierarchy});
            selectMn = 'Measures.[mn],';

            if (dimension.visualizationOptions.showDataBar) {
                selectArr.push(selectMainMeasure);
                for (var key in dimension.additionalMeasures) {
                    addMeasure = dimension.additionalMeasures[key];
                    selectArr.push('Measures.[{olapMeasure}]'.formatParams({'olapMeasure': addMeasure.olapMeasure}));
                }
            }
            if (dimension.visualizationOptions.showYearlyVariation) {
                selectArr.push(selectYearlyVariation);
            }
            if (dimension.visualizationOptions.showTrendLine) {
                selectArr.push(selectTrendline);
            }

        } else if(dimension.visualizationType == 'barchart') {
            selectArr.push(selectMainMeasure);
            for (var key in dimension.additionalMeasures) {
                addMeasure = dimension.additionalMeasures[key];
                selectArr.push('Measures.[{olapMeasure}]'.formatParams({'olapMeasure': addMeasure.olapMeasure}));
            }

            if(dimension.olapDimType == 'Date') {
                var startQuery = dimension.dateInterpolation.replace('$year', '{startyear}')
                startQuery = startQuery.replace('$month', '{startmonth}')
                startQuery = startQuery.replace('$day', '{startday}')

                startQuery = startQuery.formatParams({'startyear': startdate.year(),'startmonth': startdate.month()+1,'startday': startdate.date()})

                var endQuery = dimension.dateInterpolation.replace('$year', '{endyear}')
                endQuery = endQuery.replace('$month', '{endmonth}')
                endQuery = endQuery.replace('$day', '{endday}')
                endQuery = endQuery.formatParams({'endyear': enddate.year(),'endmonth': enddate.month()+1,'endday': enddate.date()});

                dateDim = '[{dateDimension}].{startQuery} : \
                                [{dateDimension}].{endQuery}'.formatParams({
                'dateDimension': measure.dateDimension,
                'startQuery': startQuery,
                'endQuery': endQuery});

                selectComplement = ', NON EMPTY {dateDim} ON 1'.formatParams({'dateDim': dateDim});
            }

        }
        select = selectArr.join(', ')

        if(drillDown) {
            if(dimensionName || drillDownCurrent) {
                if(dimensionName) {
                    dim = '{drillDownCurrent}.[{olapDimLevel}].Children'.formatParams({
                        'drillDownCurrent': drillDownCurrent,
                        'olapDimLevel': dimensionName
                    });
                } else {
                    dim = '{drillDownCurrent}.Children'.formatParams({
                        'drillDownCurrent': drillDownCurrent
                    });
                }

                // dim = 'NonEmptyCrossJoin([Plano.Plano - Tipo].[{olapDimLevel}], [Beneficiario.Corretor].[{olapDimLevel}].Members)'.formatParams({
                //         'olapDimLevel': dimensionName});

                selectComplement = ', non empty {dim} on 1'.formatParams(
                                    {'dim': dim});

            } else if(drillDownName) {
                dim = drillDownName+'.Children'
                selectComplement = ', non empty {dim}.Children on 1'.formatParams(
                                {'dim': dim});

            }

            // console.log(selectComplement)
        }

        if (dimension.topFunction) {
            topclausule = 'set [Top] as \
                            {topFunction}({dim}, {topNumber}, Measures.atual) \
                        member [{olapDimHierarchy}].[(Outros)] as \
                            Aggregate(Except({dim}, [Top])) \
                        set [Top+Outros] as \
                            Filter(Union([Top], \
                                        [{olapDimHierarchy}].[(Outros)]), \
                                    Measures.atual > 0)'.formatParams(
                        {'olapDimHierarchy': dimension.olapDimHierarchy, 'dim': dim,
                        'topFunction': dimension.topFunction, 'topNumber': dimension.topNumber});
            selectComplement = ', non empty [Top+Outros] on 1';
            if(dimension.topIncludeOthers != null && !dimension.topIncludeOthers) {
                selectComplement = ', non empty [Top] on 1';
            }
        }
    }

    // Filters
    measure.filters = measure.filters || [];
    defaultFilters = [];
    measure.filters.map( function (filter) {
        dimHierarchy = filter.olapDimHierarchy;
        dimLevel = filter.olapDimLevel;
        dimMember = filter.olapDimMember;

        formatedFilter = '[{dimHierarchy}].[{dimLevel}].[{dimMember}]'.formatParams({
            'dimHierarchy': dimHierarchy,
            'dimLevel': dimLevel,
            'dimMember': dimMember
        })

        defaultFilters.push(formatedFilter);
    });

    // Global filters
    $selects = $('.filter-tab:visible select');
    $selects.each(function() {
        dimMember = $(this).find('option:selected:not([value="nofilter_true"])').val();
        if(dimMember) {
            dimHierarchy = $(this).attr('hierarchy');
            dimLevel = $(this).attr('level');
            formatedFilter = '[{dimHierarchy}].[{dimLevel}].[{dimMember}]'.formatParams({
                'dimHierarchy': dimHierarchy,
                'dimLevel': dimLevel,
                'dimMember': dimMember
            });
            defaultFilters.push(formatedFilter);
        }
    });

    filts = []
    if (filteredWith.length > 0 || defaultFilters.length > 0) {
        dims = {}
        filteredWith.map( function (a) {
            name = a.name;
            if (a.drillDownName) {
                name = a.drillDownName;
            }
            if (a.dimension.olapDimHierarchy in dims) {
                dims[a.dimension.olapDimHierarchy].push(name);
            }
            else {
              dims[a.dimension.olapDimHierarchy] = [name];
            }
        });
        dim_keys = Object.keys(dims);


        for (var key_dim in dims) {
            filts.push(makeFilt(dims, key_dim));
        }

        filts = filts.concat(defaultFilters);

        dimlen = filts.length;
        if (dimlen == 1) {
            filt = filts[0];
        } else {
            filt1 = filts[0];
            filt2 = filts[1];
            filt = '{crossjoin}({filt1}, {filt2})'.formatParams({'filt1':filt1, 'filt2':filt2, 'crossjoin': crossjoin});
            if (dimlen > 2) {
                for (var i = 2; i < dimlen; i++) {
                    morefilt = filts[i];
                    filt = crossJoin(filt, morefilt);
                }
            }
        }
        if (filts.length > 0) {
            where = 'where {crossjoin}( \
            {{dateFilter}}, \
            {filter})'.formatParams({
                'dateFilter':dateFilter, 'filter' : filt,
                'crossjoin': crossjoin
            });
        }
    }

    try {
        differentHierarchy = dimension.olapDimHierarchy != measure.dateDimension;
    } catch(err) {
        differentHierarchy = true;
    }

    if(!differentHierarchy) {
        if (filts.length > 0) {
            where = 'where {filter}'.formatParams({'filter': filt});
            where = '';

        } else {
            where = '';
        }
    }
    aggregateFunction = 'Sum'
    if(measure.aggregateFunction) {
        aggregateFunction = measure.aggregateFunction
    }
    if(measure.previousValueDateInterpolation) {
        previousStartDate = measure.previousValueDateInterpolation.replace('$day', '{startdayLastY}');
        previousStartDate = previousStartDate.replace('$month', '{startmonthLastY}');
        previousStartDate = previousStartDate.replace('$year', '{startyearLastY}');

        previousEndDate = measure.previousValueDateInterpolation.replace('$day', '{enddayLastY}');
        previousEndDate = previousEndDate.replace('$month', '{endmonthLastY}');
        previousEndDate = previousEndDate.replace('$year', '{endyearLastY}');

    } else {
        previousStartDate = '[{startyearLastY}].[{startmonthLastY}].[{startdayLastY}]';
        previousEndDate = '[{endyearLastY}].[{endmonthLastY}].[{enddayLastY}]';
    }
    previousStartDate = previousStartDate.formatParams({'startyearLastY': startLastYear.year(),'startmonthLastY': startLastYear.month()+1,'startdayLastY': startLastYear.date()});
    previousEndDate = previousEndDate.formatParams({'endyearLastY': endLastYear.year(),'endmonthLastY': endLastYear.month()+1,'enddayLastY': endLastYear.date()});

    additionalWith = '';
    if(measure.additionalWith) {
        additionalWith = measure.additionalWith;
    }

    query = 'with \
                {additionalWith} \
                member Measures.atual as \
                    Measures.[{olapMeasure}] \
                member Measures.anterior as \
                    {aggregateFunction}({[{dateDimension}].{previousStartDate} : \
                    [{dateDimension}].{previousEndDate}}, Measures.[{olapMeasure}]) \
                member Measures.[Variacao] as \
                    (Measures.atual - Measures.anterior) / Measures.atual * 100 \
                member Measures.TendenciaU12M as \
                    Generate([{dateDimension}].[{startyearU12}].[{startmonthU12}] : [{dateDimension}].[{endyearU12}].[{endmonthU12}], \
                    Cast(Measures.[{olapMeasure}] + 0 as String), \", \") \
                    {topclausule} \
                {mn} \
            select {{selectMn} \
                    {select}} on 0 \
                    {selectComplement} \
                from [{olapCube}] \
            {where}'.formatParams({
                'dateDimension': measure.dateDimension, 'olapMeasure': measure.olapMeasure, 'olapCube': measure.olapCube,
                'topclausule': topclausule, 'selectComplement': selectComplement, 'mn': mn, 'selectMn': selectMn, 'where': where,
                'startyear': startdate.year(),'startmonth': startdate.month()+1,'startday': startdate.date(),
                'endyear': enddate.year(),'endmonth': enddate.month()+1,'endday': enddate.date(),
                'startyearU12': startU12.year(),'startmonthU12': startU12.month()+1,
                'endyearU12': endU12.year(),'endmonthU12': endU12.month()+1, 'select': select, 'aggregateFunction': aggregateFunction,
                'previousEndDate': previousEndDate, 'previousStartDate': previousStartDate, 'additionalWith': additionalWith
            });
    
    // if(drillDown) {
    //     console.log('query', query)
    // }
    return {'query': query, 'measure': measure, 'dimension': dimension, 'tab': tab, 'filter': filteredWith, 'u12Months': u12Months}
}

function popDimension() {
    semaphoreDimensions--;
    // every dimension is loaded, run postRefreshFn
    if (all_queued_dimensions && semaphoreDimensions === 0) {
        setTimeout(function () {
            amount_refreshes++;

            if(amount_refreshes == 1) {
                if (postRenderFn) {
                    postRenderFn()
                }
            }

            if(postRefreshFn) {
                postRefreshFn();
            }
        }, 1000);
    }
}

function successDimension(xmla, options, response, query) {
    rows = response.fetchAllAsArray();
    if(query.dimension.visualizationType == 'table') {
        // console.log('has drilldown', query.drillDownCurrent || query.dimension.drillDownBy)
        tableId = buildTable({'query':query, 'rows':rows});
        initTableEvents(tableId);
        tweakProgressBar();
        renderSparkline('spark-dimension');
    } else if(query.dimension.visualizationType == 'barchart') {
        buildBarchart({'query':query, 'rows':rows})
    }
    popDimension()

    redrawSparkline();

};

renderSparkline = function(claz) {
    options = SPARKLINE_CONFIG[claz];
    $('.'+claz).each(function(i, obj) {
        if($(this).data('values')) {
            values = $(this).data('values').split(',');
        } else {
            values = [];
        }
        options.spotColor = $(this).data('measureColor') || undefined;
        options.minSpotColor = $(this).data('minColor');
        options.maxSpotColor = $(this).data('maxColor');
        $(this).sparkline(values, options);
    });
}

function successMeasure(xmla, options, response, query) {
    rows = response.fetchAllAsArray();
    
    // currentFiltersGlobal = query.filter || currentFiltersGlobal
    currentFiltersGlobal = Array.from(new Set(currentFiltersGlobal.concat(query.filter || [])));
    
    if(query.selectMeasure) {
        selectMeasureKey(query.tab.key, query.initial_measure_key, query);
    }
    measure_value = buildMeasure(query, rows);
    if (query.measure.colorFn) {
        colorFn = eval(query.measure.colorFn)
        funcColor = colorFn(measure_value)
        query.measure.color = funcColor
        $target = $('#' + (query.tab.caption+query.measure.caption).clean());
        $target.css('background-color', funcColor)
    }
    if(query.buildTables) {
        createDimensionsForMeasure({
            'tab_key': query.tab.key,
            'measure_key': query.initial_measure_key,
            'dimension_key': query.initial_dimension_key,
            'dimension_key_not_updatable': query.dimension_key_not_updatable,
            'reloading': query.reloading,
            'filterArr': query.filter});
        }
        
    renderSparkline('spark-measure');
};

function buildTabs(tabs, global_filters) {
    $tables = $('<div id="tables"><div class="row"></</div>');

    for (var tab_key in tabs) {
        var tab = tabs[tab_key];
        $target = $('#app .nav-tabs');
        $targetPane = $('#app .tab-content');
        active = tab_key == start_tab_key ? 'active' : '';

        if(tabs.length > 1) {
            $li = '<li class="' + active + '"> \
                    <a href="#'+ tab.caption.clean() +'" tab="'+ tab_key +'" data-toggle="tab" aria-expanded="true">'+tab.caption+'</a></li>'
            $target.append($li);

        }

        active = tab_key == start_tab_key ? 'active in' : ''
        $tabpane = $('<div class="tab-pane fade ' + active + '" id="'+ tab.caption.clean() +'"/>');

        $row = $('<div class="row" />');

        for (var measure_key in tab.measures) {
            var measure = tab.measures[measure_key];
            // background-color: #78aad2;
            if (measure.color) {
                color = measure.color.length > 1 ? measure.color : '#78aad2';
            } else {
                color = '#78aad2';
            }
            $col = $('<div style="background-color: '+color+';" class="col-xs-6 col-sm-4 col-md-3 col-lg-2 measure-loader" \
                measure="'+ measure_key +'" tab="'+ tab_key +'" id='+(tab.caption+measure.caption).clean()+'/>');

            $col.append($('<div class="spinner-measure"/>'));

            $row.append($col);
        }

        $tabpane.append($row);

        $targetPane.append($tabpane);
    }

    for (var global_filter_key in global_filters) {
        var global_filter = global_filters[global_filter_key];
        if (!global_filter.name) {
            global_filter.name = global_filter.olapDimHierarchy + global_filter.olapDimLevel
        }

        $target.append('<li class="filter-tab"> \
            <select hierarchy="'+global_filter.olapDimHierarchy+'" \
            level="'+global_filter.olapDimLevel+'" id="'+ global_filter.name +'"> \
              <option value="nofilter_true" >('+ global_filter.caption +')</option> \
            </select></li>');
    }

    $target.append('<li class="datepicker-tab"><div id="reportrange"><i class="fa fa-calendar"></i> <span></span></div></li>');
    initDatePicker();
    if(global_filters) {
        measure = tabs[start_tab_key].measures[0];
        updateGlobalFilters(measure, true);
    } else {
        updateMeasure({'tab_key': start_tab_key, 'initial_measure_key': 0});
    }
    initTabFunctions();
    $targetPane.append($tables);

    if(sidemenu) {
        var $sidemenuTarget = $('#app .tab-content')
        $sidemenuTarget.append('<div id="mySidenav" class="sidenav"> \
            <div class="circle"> \
                <div class="toggle"><i class="fa fa-bars fa-lg fa-rotate-90" aria-hidden="true"></i></div> \
            </div> \
            <div class="clearfix"></div> \
            <div class="sidenav-content"> \
            </div> \
        </div>');
        initSidemenu();
    }
};

function successSidemenu(xmla, options, response, query) {
    rows = response.fetchAllAsArray();
    buildSidemenu({'query':query, 'rows':rows})
};

function prepareSidemenu() {
    var $target = $('#mySidenav .sidenav-content');
    for(var key in sidemenu.sessions) {
        var session = sidemenu.sessions[key];
        var addClass = '';
        var $content = $('<div id="session-'+ key +'" class="content-details">');
        $target.append($content);
        if(session.title) {
            $content.append('<div class="data-caption">'+ session.title +'</div>');
        } else {
            addClass = 'data-caption';
        }

        query = {
            query: session.query.statement,
            id: 'session-'+ key,
            olapCatalog: session.query.olapCatalog,
            addClass: addClass
        };
        new QueryBuilder(query, successSidemenu).run();
    }
}

function buildSidemenu(params) {
    var query = params.query || null;
    var rows = params.rows || null;
    var $target = $('#'+query.id);
    var $dataBox = $('<div class="data-box '+query.addClass+'">')
    $target.append($dataBox);

    for(var key in rows) {
        var row = rows[key];
        $dataBox.append('<div class="data-item"> \
            <span class="key">'+row[0]+'</span> \
            <span class="item">'+row[1]+'</span> \
            </div>')
    }
}

function buildGlobalFilters(params) {
    var query = params.query || null;
    var rows = params.rows || null;
    var $select = $('#'+query.global_filter.name);

    $select.parent().show();
    $select.empty();
    $select.append('<option value="nofilter_true">('+ query.global_filter.caption +')</option>');

    for (var row_key in rows) {
        var row = rows[row_key];
        $option = $('<option value="'+ row[1] +'">'+ row[0] +'</option>')
        $select.append($option);
    }

    var initialValue = query.global_filter.initialValue;
    if(initialValue) {
        var $option = undefined;
        if(initialValue.olapDimMember) {
            $option = $select.find('option[value="'+initialValue.olapDimMember+'"]');
        } else if(initialValue.first && !query.global_filter.lazyLoading) {
            $option = $($select.find('option')[1]);
        }

        if($option)
            $select.val($option.val());

    }
    if(query.global_filter.componentType == "autocomplete") {
        initSelectize($select, params);
    }
    $('.filter-tab select').unbind('change');
    $('.filter-tab select').on('change', function(e) {
        if(this.value)
            reload();
    });
}

function initSelectize($select, params) {
    var exceededWindowHeight = false;
    options = {
        plugins: ['item_nowrap'],
        searchField: ['text', 'value'],
        render: {
            option: function(item, escape) {
                var label = item.text || item.value;
                var caption = item.text ? item.value : null;

                if(caption == 'nofilter_true') {
                    caption = '';
                }
                return '<div>' +
                    '<div class="option-label">' + escape(label) + '</div>' +
                    (caption ? '<div class="option-caption">' + escape(caption) + '</div>' : '') +
                '</div>';
            }
        },
        onInitialize: function () {
            var s = this;
            this.revertSettings.$children.each(function () {
                $.extend(s.options[this.value], $(this).data());
            });
        }
    };

    if(params.query.global_filter.lazyLoading) {

        options.load = function(q, callback) {
            if (!q.length || q.length < 3) return callback();
            lazyQuery = makeGlobalFilterQuery(params.query.global_filter, params.query.measure, q);
            lazyQuery.callback = callback
            new QueryBuilder(lazyQuery, successGlobalFilters).run();
        }
    }
    $select.selectize(options);
}
function successGlobalFilters(xmla, options, response, query) {
    rows = response.fetchAllAsArray();
    if(query.callback) {
        formattedRows = rows.map(function(x) {
            return {'text': x[0], 'value':x[1]}
        });
        query.callback(formattedRows)
    } else {
        buildGlobalFilters({'query':query, 'rows':rows});
        semaphoreGlobalFilter--;
        if (all_queued_global_filter && semaphoreGlobalFilter === 0) {
            updateMeasure({'tab_key': start_tab_key, 'initial_measure_key': 0});
            prepareSidemenu();
        }
    }
};

function updateGlobalFilters(measure, rebuild) {
    for (var global_filter_key in global_filters) {
        var global_filter = global_filters[global_filter_key];

        globalOptions = measure.globalFiltersOptions;
        try {
            options = globalOptions[global_filter.name]
        } catch(err) {
            options = {};
            disabled = options.disabled;
        }

        if (!options) {
            options = {};
        }

        disabled = options.disabled;

        if(options.useOlapDimHierarchy) {
            measure.olapDimHierarchy = options.useOlapDimHierarchy
        } else {
            measure.olapDimHierarchy = global_filter.olapDimHierarchy;
        }
        
        $select = $('#'+global_filter.name);
        $select.attr('hierarchy', measure.olapDimHierarchy);
        if(disabled) {
            $select.parent().hide();
        } else if(rebuild) {
            if(global_filter.lazyLoading) {
                q='%%%';
                if(global_filter.initialValue.olapDimMember) {
                    q = global_filter.initialValue.olapDimMember;
                }
                query = makeGlobalFilterQuery(global_filter, measure, q);
            }
            else {
                query = makeGlobalFilterQuery(global_filter, measure);
            }

            semaphoreGlobalFilter++;
            console.log(query.query)
            new QueryBuilder(query, successGlobalFilters).run();
        } else {
            $select.parent().show();
        }
    }
    all_queued_global_filter = true;
}

function makeGlobalFilterQuery(global_filter, measure, filter) {

    globalOptions = measure.globalFiltersOptions;
    if(filter) {
        select = "Filter([{olapDimHierarchy}].[{olapDimLevel}].Members, \
                          [{olapDimHierarchy}].CurrentMember.Name matches '(?i).*{filter}.*' or \
                             [{olapDimHierarchy}].CurrentMember.Properties('MEMBER_CAPTION') matches '(?i).*{filter}.*') on 1".formatParams({
                        'olapDimHierarchy': measure.olapDimHierarchy,
                        'olapDimLevel': global_filter.olapDimLevel,
                        'filter': filter
                    });
    } else {
        select = '{[{olapDimHierarchy}].[{olapDimLevel}].Members} on 1'.formatParams({
                    'olapDimHierarchy': measure.olapDimHierarchy,
                    'olapDimLevel': global_filter.olapDimLevel
                });

    }
    query = 'with member Measures.mn as [{olapDimHierarchy}].CurrentMember.Name \
                select {Measures.mn} on 0, \
            {select} \
            from [{olapCube}]'.formatParams({
                'olapDimHierarchy': measure.olapDimHierarchy,
                'olapDimLevel': global_filter.olapDimLevel,
                'olapCube': measure.olapCube,
                'select': select
            });

    return {'query': query, 'measure': measure, 'global_filter': global_filter}
}

function selectMeasureKey(tab_key, measure_key, query) {
    measure = tabs[tab_key].measures[measure_key];
    same = parseInt($('.measure-selected').attr('measure')) == measure_key &&
            parseInt($('.measure-selected').attr('tab')) == tab_key;

    if(!same) {
        $('.measure-loader').removeClass('measure-selected');
        $('.measure-selected').removeClass('measure-selected');
        $($('.measure-loader[measure='+measure_key+'][tab='+tab_key+']')[0]).addClass('measure-selected');
    }

}

function processTrendline(trendline) {
    return trendline.split(',').map(function(x) {
        return format( query.measure.numberFormat, parseFloat(x) )
    }).join(', ');
}

function buildMeasure(query, rows) {
    row = rows[0];
    $target = $('#' + (query.tab.caption+query.measure.caption).clean());
    $target.empty();

    variacao_measure = row[VARIACAO_MEASURE];
    variation = parseInt(preprocessNumber(variacao_measure));
    sign = getVariationSign(query.measure, variation);
    toolt = ''
    if(query.measure.tooltip) {
        toolt = query.measure.tooltip;
    }
    $display = $('<div class="display" tooltip="'+toolt+'"/>');
    $number = $('<div class="number"/>');
    measure_measure = preprocessNumber(row[MEASURE_MEASURE]);
    
    measure_measure = format(query.measure.numberFormat, measure_measure)
//     visualizationOptions
// showMonthlyVariation
// showYearlyVariation
// showTrendLine
    showVariation = false
    if (query.measure.visualizationOptions && query.measure.visualizationOptions.showMonthlyVariation == null && query.measure.visualizationOptions.showYearlyVariation == null){
        showVariation = true
    } else {
        if(query.measure.visualizationOptions) {
            showVariation = query.measure.visualizationOptions.showMonthlyVariation || query.measure.visualizationOptions.showYearlyVariation;
        } else {
            showVariation = true
        }
    }
    if (showVariation) {
        $variation = $('<small class="variation-right pull-right"><i class="fa fa-lg fa-caret-'+sign+'" aria-hidden="true"></i> '+variation+'%</small>');
    } else {
        $variation = $('<small class="variation-right pull-right"><i class="fa fa-lg aria-hidden="true"></i>&nbsp</small>');
    }
    
    $target.append($variation);
    $target.append($('<div class="clearfix" />'));
    
    $target.append($display);
    $display.append($number);

    $measure_measure = $('<div class="measure-measure">'+measure_measure+'</div>');
    $measure_caption = $('<div class="measure-caption"> '+ query.measure.caption +' \ </div>');
    $number.append($measure_caption);
    $number.append($measure_measure);
    
    showTrendline = false
    if (query.measure.visualizationOptions && query.measure.visualizationOptions.showTrendLine == null){
        showTrendline = true
    } else {
        if(query.measure.visualizationOptions) {
            showTrendline = query.measure.visualizationOptions.showTrendLine
        } else {
            showTrendline = true
        }
    }

    $graph = $('<div style="min-height: 35px;"  class="graph"/>');
    if(showTrendline) {
        $trendline = $('<span class="spark-measure"></span>');
        $trendline.data('u12Months', query.u12Months);
        $trendline.data('values', row[TENDENCIA_MEASURE]);
        $trendline.data('format', query.measure.numberFormat);
        var maxColor = query.measure.orientation == 'up' ? '#7fe174' : '#fd7159';
        var minColor = query.measure.orientation == 'up' ? '#fd7159' : '#7fe174';
        if (query.measure.color) {
            measure_color = query.measure.color.length > 1 ? query.measure.color : '#78aad2';
        } else {
            measure_color = '#78aad2';
        }
    
        $trendline.data('minColor', minColor);
        $trendline.data('maxColor', maxColor);
        $trendline.data('measureColor', measure_color);
        $graph.append($trendline);
    
    }
    $card = $('<div class="card-measure"/>');
    $target.append($card);
    $card.append($graph);
    $(".measure-loader").unbind('click');
    $('.measure-loader').click(function(e) {
        var $this = $(this);
        measure_key = $this.attr('measure');


        tab_key = $this.attr('tab');

        updateMeasure({
            'tab_key': tab_key,
            'initial_measure_key': measure_key,
            'shouldUpdateAll': false
        });
    });

    return preprocessNumber(row[MEASURE_MEASURE])
};

function getVariationSign(measure, variation) {
    if (variation > 0) {
        color = measure.orientation == 'up' ? 'good' : 'bad';
        sign = 'up ' + color;
    } else if (variation < 0) {
        color = measure.orientation == 'up' ? 'bad' : 'good';
        sign = 'down ' + color;
    }
    else {
        sign = 'right';
    }

    return sign;

};

function getDimensionFilters(measure, exclude, current) {
    filterArr = [];
    excluded = false;
    if(exclude != null) {
        filtersGlobal = currentFiltersGlobal.slice();

        filtersGlobal = filtersGlobal.filter(function(elem, index) {
            if (!(current instanceof Array)) {
                equalCurrent = elem.name == current
            } else {
                equalCurrent = false;
                for (var index = 0; index < current.length; ++index) {
                    if (current[index] == elem.name) 
                        equalCurrent = true;
                }
            }
            ret = measure.dimensions.indexOf(elem.dimension) != exclude && !equalCurrent
            excluded = excluded || !ret;
            return ret
        })
        filtersGlobal.forEach(function(elem) {
            // $(this) is relative to each dimension-selected.
            name = elem.name;

            obj = {
                'dimension': elem.dimension, 'name': name,
                'drillDownName': null
            };
            filterArr.push(obj);
        });
        return {filterArr: filterArr, excluded: excluded};

    }

    $elems = $('.dimension-selected');
    $elems.each(function() {
        // $(this) is relative to each dimension-selected.
        tabCurrent = tabs[$(this).attr('tab')]
        measureCurrent = tabCurrent.measures[$(this).attr('measure')]
        dimensionCurrent = measureCurrent.dimensions[$(this).attr('dimension')]
        drillCurrent = $('#'+(tabCurrent.caption+measureCurrent.caption+dimensionCurrent.caption).clean()).attr('drilldowncurrent');

        name = $(this).attr('name');
        if(drillCurrent) {
            drillDownName = drillCurrent + '.['+name+']';
        } else {
            drillDownName = null;
        }
        obj = {
            'dimension': measure.dimensions[$(this).attr('dimension')], 'name': name,
            'drillDownName': drillDownName
        };
        filterArr.push(obj);
    });
    return {filterArr: filterArr, excluded: excluded};
}

function buildBarchart(params) {
    query = params.query;
    var rows = params.rows;
    tableId = (query.tab.caption+query.measure.caption+query.dimension.caption).clean();
    $col = $('#' + tableId);
    $col.empty();
    $chart = $('<div class="panel-body"><div id="'+tableId+'-chart"/></div>');
    $col.removeClass('table-loading');
    $col.append($chart);
    var height = query.dimension.rows*(115) - 43 - 15;

    lineIndex = query.dimension.visualizationOptions.useLineForIndex
    pattern = []
    categories = []
    columns = []
    measures = []
    for (var i = 0; i <= query.dimension.additionalMeasures.length; i++) {
        if (i == 0) {
            currentMeasure = query.measure;
        } else {
            currentMeasure = query.dimension.additionalMeasures[i-1]
        }
        pattern.push(currentMeasure.color);
        columns.push([currentMeasure.caption])
    }
    for (var row_key in rows) {
        var row = rows[row_key];
        categories.push(row[row.length-4])
        columns[0].push(row[row.length-3])
        columns[1].push(row[row.length-2])
        columns[2].push(row[row.length-1])

    }
    types = {}
    types[columns[lineIndex][0]] = 'line';
    c3.generate({
        size: {
            height: height
        },
        bindto: '#'+tableId+'-chart',
        data: {
            columns: columns,
            type: 'bar',
            types: types,
        },
        axis: {
            x: {
                type: 'category',
                categories: categories
            }
        },
        color: {
            pattern: pattern
        }
    });


}
function buildTable(params) {
    query = params.query;
    var rows = params.rows;

    tableId = '#' + (query.tab.caption+query.measure.caption+query.dimension.caption).clean();
    $col = $(tableId);
    $col.empty();
    $panel = $('<div class="panel panel-default panel-no-margin"/>');
    var color = '#78aad2';
    if (query.measure.color) {
        var color = query.measure.color.length > 1 ? query.measure.color : '#78aad2';
    }
    toolt = ''
    if(query.measure.tooltip) {
        toolt=query.measure.tooltip;
    }
    $panelHeading = $('<div class="panel-heading" tooltip="'+toolt+'"/>');
    // $icon = $('<i class="fa fa-bar-chart-o fa-fw"></i>');

    searchable = query.dimension.searchable == undefined || query.dimension.searchable

    caption = ' ' + query.measure.caption + ' por ' + query.dimension.caption;
    // $panelHeading.append($icon);

    classLeft = searchable ? 'pull-left searchable-title' : ''
    if(query.measure.alternativeDimensions) {
        $dropdownalt = $('<span class="dropdown dropselect dropdown-dimension"> \
            <span class="dropdown-toggle" data-toggle="dropdown" aria-expanded="true"> \
            <span class="dropdown-label '+ classLeft +'" from-id='+query.measure.dimensions.indexOf(query.dimension)+'>'+caption+'</span> \
            <span class="caret"></span> \
          </span> \
          </span>');
        $ul = $('<ul class="dropdown-menu" role="menu" aria-labelledby="option-post-cleanup"></ul>');
        for (var alt_key in query.measure.alternativeDimensions) {
            var altDim = query.measure.alternativeDimensions[alt_key];
            caption = ' ' + query.measure.caption + ' por ' + altDim.caption;
            $ul.append('<li role="presentation"><a class="altdim" role="menuitem" to-id='+alt_key+' tabindex="-1">' + caption + '</a></li>')
        }
        $dropdownalt.append($ul);
        $panelHeading.append($dropdownalt);
    }
    else
        $panelHeading.append('<span class="'+ classLeft +'">'+caption+'</span>');

    //  \

    if(searchable) {
        $panelHeading.append('<span class="pull-right"> \
            <i class="searchable-search fa fa-search fa-lg"></i> \
            <input class="pull-right searchable-input form-control active" type="text" name="search" placeholder="Pesquisar"> \
            </span>');
    }

    // changeDimensionToAlternativeDimension(0, 0, 0, 1)
    //
    $panelHeading.append($('<div class="clearfix"></div>'));
    // 4*145 = 580 = 623
    // 2*145 = 290 = 333
    var height = query.dimension.rows*(160) - 58;// - 30;
    $panelBody = $('<div class="panel-body pre-scrollable scrollingbar" style="max-height: unset; height: '+ height +'px !important;">');
    $panel.append($panelHeading);
    var idx = getColumns(rows[0], query);

    if(idx.EXTRA_CAPTIONS.length > 0) {
        $bread = $('<ul class="breadcrumb"/>');
        $todos = $('<li> <a href="javascript:void(0)" onclick="breadcrumbNavigate.call(this)" class="drillDownLevel caption"\
                    level="0" dimension="'+ query.dimension.key +'">Todos</a></li>');
        $bread.append($todos);
        // $panelHeading.append(rows[0][key]);

        for (var i = 0; i < idx.EXTRA_CAPTIONS.length; i++) {
            key = idx.EXTRA_CAPTIONS[i];
            if(key+1 == idx.EXTRA_CAPTIONS.length) {
                $capt = $('<li><span class="caption" level="'+(key+1)+'">'+rows[0][key]+'</span></li>')

            } else {
                $capt = $('<li><a href="javascript:void(0)" onclick="breadcrumbNavigate.call(this)" class="drillDownLevel caption" \
                  dimension="'+ query.dimension.key +'" level="'+(key+1)+'">'+rows[0][key]+'</a></li>')
            }
            $bread.append($capt)
        }
        // $col.data('captionLevels', captionLevels);
        $panelHeading.append($bread);
    }
    // $table.append($thead);
    hasDrillDown = false;
    if (query.drillDownCurrent || query.dimension.drillDownBy) {
        hasDrillDown = true;
    }
    drillDownCurrent = '';
    level = '';
    if(hasDrillDown) {
        if(!query.drillDownCurrent) {
            drillDownCurrent = '['+ query.dimension.olapDimHierarchy +']';
            level=0;
        } else {
            drillDownCurrent = query.drillDownCurrent;
            level = query.level
        }
        $col.attr('drilldowncurrent', drillDownCurrent);
        $col.attr('level', level);
    }

    var qtyMeasures = 0;
    if(query.dimension.additionalMeasures) {
        qtyMeasures = query.dimension.additionalMeasures.length
    }

    max_measures = []
    for (var i = 0; i <= qtyMeasures; i++) {
        max_measures[i] = rows.reduce(function(max, arr) {
            return Math.max(max, arr[idx.MEASURE+i]);
        }, -Infinity);
        max_measures[i] = max_measures[i] == -Infinity ? null : max_measures[i];
    }

    $container = $('<div class="table-box container-fluid"/>');

    var caption_columns = 4
    var measure_columns = 4
    var variation_columns = 2
    var sparkline_columns = 2
    if(query.dimension.visualizationType==='table' && rows.length>0) {
        var $row = $('<div class="row row-header"/>')
        total_columns = query.dimension.visualizationOptions.showDataBar * measure_columns +
        query.dimension.visualizationOptions.showYearlyVariation * variation_columns +
        query.dimension.visualizationOptions.showTrendLine * sparkline_columns
        total_elements = query.dimension.visualizationOptions.showDataBar +
                         query.dimension.visualizationOptions.showYearlyVariation +
                         query.dimension.visualizationOptions.showTrendLine;

        total_left = 8-total_columns;
        columnIncrement = total_left / total_elements;
        measure_columns += Math.ceil(columnIncrement) * query.dimension.visualizationOptions.showDataBar
        variation_columns += Math.trunc(columnIncrement) * query.dimension.visualizationOptions.showYearlyVariation
        sparkline_columns += Math.trunc(columnIncrement) * query.dimension.visualizationOptions.showTrendLine
        if (query.dimension.additionalMeasures) {
            var original_mc = measure_columns;
            measure_columns /= (query.dimension.additionalMeasures.length+1);
            measure_columns = Math.trunc(measure_columns);
            caption_columns += (original_mc - (measure_columns*(query.dimension.additionalMeasures.length+1)));

            if(query.dimension.visualizationOptions.showDataBar ) {
                for (var i = 0; i <= qtyMeasures; i++) {
                    if (i == 0) {
                        $colBar = $('<div class="col-xs-'+measure_columns+' col-xs-offset-'+caption_columns+' col-no-padding "/>');
                        $colBar.append(query.measure.caption)
                    } else {
                        $colBar = $('<div class="col-xs-'+measure_columns+' col-no-padding "/>');
                        $colBar.append(query.dimension.additionalMeasures[i-1].caption);
                    }

                    $row.append($colBar);

                }
            }
        } else if(rows.length>0) {
            if(query.dimension.visualizationOptions.showDataBar) {
                $colBar = $('<div class="col-xs-'+measure_columns+' col-xs-offset-'+caption_columns+' col-no-padding "/>');
                $colBar.append(query.measure.caption)
                $row.append($colBar);

            }
        }
        if(query.dimension.visualizationOptions.showYearlyVariation) {
            $colBar = $('<div class="col-xs-'+variation_columns+' col-xs-offset-'+caption_columns*!query.dimension.visualizationOptions.showDataBar+' col-no-padding "/>');
            $colBar.append('VARIAÇÃO')
            $row.append($colBar);

        }

        if(query.dimension.visualizationOptions.showTrendLine) {
            $colBar = $('<div class="col-xs-'+sparkline_columns+' col-xs-offset-'
                +caption_columns*
                !query.dimension.visualizationOptions.showDataBar*
                !query.dimension.visualizationOptions.showYearlyVariation+' col-no-padding "/>');
            $colBar.append('TENDÊNCIA')
            $row.append($colBar);

        }
        $container.append($row);
    }
    // console.log('global', currentFiltersGlobal, 'current', query.filteredCurrent)
    // currentFiltersGlobal = Array.from(new Set(currentFiltersGlobal.concat(query.filteredCurrent || [])));

    for (var row_key in rows) {
        var row = rows[row_key];
        selected=''
        if (currentFiltersGlobal) {
            checkequals = currentFiltersGlobal.filter(function(e) {
                return (e.name + e.dimension.caption).clean() == (row[idx.NAME] + query.dimension.caption).clean()
            });
            if (checkequals.length > 0) {
                selected='dimension-selected';
            }
        }
        isCaption = row[idx.CAPTION] ? true : false
        captionText = isCaption ? row[idx.CAPTION] : row[idx.NAME];
        selectable = isCaption ? 'selectable' : '';

        $row = $('<div class="row '+ selected + ' ' + selectable +'" \
            tab="'+query.tab.key+'"  measure="'+query.measure.key+'"  dimension="'+query.dimension.key+'" \
            name="'+row[idx.NAME]+'" />');

        if(hasDrillDown && level < query.dimension.drillDownBy[0].levels) {
            $row.append('<div class="col-xs-'+caption_columns+' no-popover col-no-padding ">\
                <div class="col-xs-11 caption no-popover">'+captionText+'</div> \
                <div class="col-xs-1 drilldown-link no-popover"><a href="javascript:void(0)"><i class="fa fa-level-down" \
                style="color: '+ color +'" aria-hidden="true"></i></a></div> \
                </div>');
        } else {
            $row.append('<div class="col-xs-'+caption_columns+' caption no-popover">' + captionText + '</div>');
        }
        if(query.dimension.visualizationOptions.showDataBar) {
            // Builds the component for the measure - a bar
            // console.log(qtyMeasures)
            for (var i = 0; i <= qtyMeasures; i++) {
                $colBar = $('<div class="col-xs-'+measure_columns+' col-no-padding "/>');
                if (i == 0) {
                    fmt = query.measure.numberFormat
                } else {
                    fmt = query.dimension.additionalMeasures[i-1].numberFormat || query.measure.numberFormat
                }
                mval = row[idx.MEASURE+i] 
                if (!mval) {
                    mval = 0
                }
                measure = format(fmt, mval);
                $bar = $('<div class="progress-bar bar-default" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"\
                    style="width: '+ (row[idx.MEASURE+i]/max_measures[i])*100 +'%; background-color: '+ color +'"><span>'+measure+'</span></div>');
                if(i % 2 != 0)
                    $bar.lighten({'percent': 20})

                $colBar.append($('<div class="progress"/>').append($bar));
                $row.append($colBar);

            }

        }

        if(query.dimension.visualizationOptions.showYearlyVariation) {
            // Builds the component for variation - + sign for positive - sign for negative.
            variation = parseInt(preprocessNumber(row[idx.VARIACAO]))
            sign = getVariationSign(query.measure, variation);
            // variation = query.measure.numberFormat;
            $row.append('<div class="col-xs-'+variation_columns+' col-nowrap col-no-padding ">' + '<i class="fa fa-lg fa-caret-'+ sign +'" aria-hidden="true"></i> ' + variation + '%</div>');
        }

        if(query.dimension.visualizationOptions.showTrendLine) {
            // Builds the component for variation - a sparkline
            $trendline = $('<span class="spark-dimension"></span>');
            $trendline.data('values', row[idx.TENDENCIA]);
            $trendline.data('u12Months', query.u12Months);

            $trendline.data('format', query.measure.numberFormat);
            var maxColor = query.measure.orientation == 'up' ? '#7fe174' : '#fd7159';
            var minColor = query.measure.orientation == 'up' ? '#fd7159' : '#7fe174';
            $trendline.data('minColor', minColor);
            $trendline.data('maxColor', maxColor);
            $spark = $('<div class="col-xs-'+sparkline_columns+' col-no-padding"/>').append($trendline);
            $row.append($spark);
        }

        if (hasDrillDown) {
            initPopover($row, row, query.dimension.drillDownBy, idx, $col);
        }

        $container.append($row)
    }
    $panelBody.append($container)
    $panel.append($panelBody);
    $col.append($panel);
    $col.removeClass('table-loading');

    return tableId;
}


function initTableEvents(tableId) {
    var DELAY = 350, clicks = 0, timer = null;

    // $target.find(".table-box .selectable").unbind('click');
    $(tableId + ' .table-box .selectable').click(function(e) {
        var $this = $(this);
        wasPopover = $(e.target).hasClass('popover-drill');
        tab = tabs[$this.attr('tab')];
        measure = tab.measures[$this.attr('measure')];
        dimension = measure.dimensions[$this.attr('dimension')]
        if (timer == null) {
            timer = setTimeout(function() {
                clicks = 0;
                timer = null;
                // single click code
                $this.toggleClass("dimension-selected");

                // here i remove from global filters object if the element is unselected
                if(!$this.hasClass('dimension-selected')) {
                    function wasRemoved(globalFilter) {
                        return !(globalFilter.dimension == dimension && globalFilter.name == $this.attr('name'))
                    }
                    currentFiltersGlobal = currentFiltersGlobal.filter(wasRemoved);
                }
                
                filterArr = getDimensionFilters(measure).filterArr;
                updateMeasure({
                    'tab_key': $this.attr('tab'),
                    'filter': filterArr.slice(0),
                    'initial_measure_key': $this.attr('measure'),
                    'initial_dimension_key': $this.attr('dimension')
                });

            }, DELAY);
        }

        if(clicks === 1 || wasPopover) {
            clearTimeout(timer);
            timer = null;
            clicks = -1;
            // double click code
            if (dimension.drillDownBy) {
                doDrillDown($this);
            }
        }
        clicks++;
    });
    $(tableId + ' .table-box .selectable .drilldown-link').click(function(e) {
        e.stopPropagation();
        doDrillDown($($(this).parent().parent()));
    });
    $('.dropdown-dimension .altdim').unbind('click');
    $('.dropdown-dimension .altdim').click(function(e) {
        var $this = $(this);
        from_id = $this.parent().parent().parent().find('.dropdown-label').attr('from-id')
        to_id = $this.attr('to-id')
        changeDimensionToAlternativeDimension(tabs.indexOf(query.tab), tab.measures.indexOf(query.measure), from_id, to_id)
    });
    $elems = $(".searchable-input").filter(function (i, e) {
        return !$(e).is(':focus') && !$(e).val();
    });
    // if(!.val()) {
    $elems.hide();
    // }

    $('.searchable-search').unbind('click');
    $('.searchable-search').click(function(e) {
        $($(e.target).parents()[1]).find('.searchable-title').css('width', '45%')
        $($(e.target).parents()[1]).find('.searchable-input').show().focus();
        // $($(e.target).parents()[1]).find('.searchable-input');
        $(e.target).hide()
    });
    $('.searchable-input').focusout(function(e) {
        if($(e.target).val()) {
            return
        }
        $($(e.target).parents()[1]).find('.searchable-title').css('width', 'auto')
        $($(e.target).parents()[1]).find('.searchable-search').show();
        $(e.target).hide()

        // $($(e.target).parents()[1]).find('.searchable-input');
        // $(e.target).hide()
    });

    $(".searchable-input").keyup(function(e) {
        query = $(e.target).val();
        $($(e.target).parents()[2]).find('.container-fluid .selectable').show();
        $($(e.target).parents()[2]).find('.container-fluid .selectable:not(:icontains("'+query+'"))').hide();

    });


}
function doDrillDown(elem) {
    tab = tabs[elem.attr('tab')];
    measure = tab.measures[elem.attr('measure')];
    dimension = measure.dimensions[elem.attr('dimension')];
    exclude = elem.attr('dimension')
    current = elem.attr('name')
    f = getDimensionFilters(measure, exclude=exclude, current=current);
    filterArr = f.filterArr
    excluded = f.excluded

    $dimensionData = $('#'+(tab.caption+measure.caption+dimension.caption).clean());

    drillDownCurrent = $dimensionData.attr('drilldowncurrent');
    level = $dimensionData.attr('level');
    level = parseInt($dimensionData.attr('level'));
    level += 1;
    currentFiltersGlobal = currentFiltersGlobal.filter(function(elem, index) {
        equalCurrent = elem.name == current
        ret = measure.dimensions.indexOf(elem.dimension) != exclude || equalCurrent
        return ret
    })

    if (level <= dimension.drillDownBy[0].levels) {
        updateTableWithDrillDown({
            'tab_key': elem.attr('tab'),
            'measure_key': elem.attr('measure'),
            'dimension_key': elem.attr('dimension'),
            'dimensionName': elem.attr('name'),
            'drillDownCurrent': drillDownCurrent,
            'level': level,
            'filter': filterArr.slice(0)
        });
    }

    if(excluded) {
        updateMeasure({
            'tab_key': elem.attr('tab'),
            'filter': currentFiltersGlobal.slice(0),
            'initial_measure_key': elem.attr('measure'),
            'initial_dimension_key': elem.attr('dimension'),
            'dimension_key_not_updatable': elem.attr('dimension')
        });
    }
}

function updateTableWithDrillDown(params) {
    var tab_key = params.tab_key;
    var filter = params.filter || [];
    var measure_key = params.measure_key;
    var dimension_key = params.dimension_key;
    var dimensionName = params.dimensionName;
    var drillDownCurrent = params.drillDownCurrent;
    var level = params.level;

    var tab = tabs[tab_key];
    var measure = tab.measures[measure_key];
    var dimension = measure.dimensions[dimension_key];
    $dimensionData = $('#'+(tab.caption+measure.caption+dimension.caption).clean());
    $dimensionData.find('.panel-body').empty();
    $dimensionData.find('.panel-body').append($('<div class="spinner"/>'));
    var query = makeQuery({
        'measure': measure,
        'tab': tab,
        'dimension': dimension,
        'filteredWith': filter,
        'drillDown': true,
        'dimensionName': dimensionName,
        'drillDownCurrent': drillDownCurrent

    });
    query.measure.key = measure_key;
    query.tab.key = tab_key;
    query.dimension.key = dimension_key;
    if(dimensionName.length > 0) {
        query.drillDownCurrent = drillDownCurrent+'.['+dimensionName+']';
    } else {
        query.drillDownCurrent = drillDownCurrent;
    }

    query.level = level;
    new QueryBuilder(query, successDimension).run();

}

function updateMeasure(params) {
    tab_key = params.tab_key;
    filter = params.filter || [];
    initial_measure_key = params.initial_measure_key;
    initial_dimension_key = params.initial_dimension_key;
    dimension_key_not_updatable = params.dimension_key_not_updatable || null;
    shouldUpdateAll = params.shouldUpdateAll == null || params.shouldUpdateAll ? true : false;
    reloading = params.reloading || false;
    tab = tabs[tab_key]
    measures = tab.measures
    thisMeasure = measures[initial_measure_key];
    filterArr = getDimensionFilters(thisMeasure).filterArr;
    if(!shouldUpdateAll && !(filter.length>0 || filterArr.length>0)) {
        measures = [thisMeasure];
    }
    measure = tabs[tab_key].measures[initial_measure_key];
    updateGlobalFilters(measure, false);
    for (var measure_key in measures) {
        var measure = measures[measure_key];
        $target = $('#' + (tab.caption+measure.caption).clean());
        $target.empty();
        $target.append($('<div class="spinner-measure"/>'));
        query = makeQuery({'measure': measure, 'tab': tab, 'filteredWith': filter});
        query.filter = filter;
        query.reloading = reloading;
        query.tab.key = tab_key
        query.measure.key = measure_key
        query.buildTables = false;
        if (measure_key == initial_measure_key || measures.length==1) {
            // On the success function the method createDimensionsForMeasure is called,
            // with those parameters.
            query.buildTables = true;
            query.initial_tab_key = tab_key;
            query.initial_measure_key = initial_measure_key;
            query.initial_dimension_key = initial_dimension_key;
            query.filter = filter;
            query.dimension_key_not_updatable = dimension_key_not_updatable;
            query.selectMeasure = true;
        }
        new QueryBuilder(query, successMeasure).run();
    }

}

function getDrillDownName(col) {
    if(col.attr('drilldowncurrent')) {
        return col.attr('drilldowncurrent');
    }
    return null;
}

function updateAltDimensionLabels(tab_key, measure_key, from_dim_key, to_alt_dim_key) {
    tab = tabs[tab_key];
    measure = tab.measures[measure_key];
    if(!measure.alternativeDimensions) return;

    for (var dim_key in measure.dimensions) {
        var dimension = measure.dimensions[dim_key];
        altDim = measure.alternativeDimensions[to_alt_dim_key]
        tableId = '#' + (tab.caption+measure.caption+dimension.caption).clean();
        new_caption = measure.caption + ' por ' + altDim.caption;
        $lis = $(tableId + ' .dropdown-menu li a');
        $($lis[0]).text(new_caption);
    }
}

function changeDimensionToAlternativeDimension(tab_key, measure_key, from_dim_key, to_alt_dim_key) {
    tab = tabs[tab_key];
    measure = tab.measures[measure_key];

    temp_alt = measure.alternativeDimensions[to_alt_dim_key];
    temp_current = measure.dimensions[from_dim_key];
    // console.log('alt', temp_alt)
    // console.log('curr', temp_current)
    if(!temp_alt || !temp_current) {
        return
    }
    measure.alternativeDimensions[to_alt_dim_key] = temp_current;
    measure.dimensions[from_dim_key] = temp_alt;

    filterArr = getDimensionFilters(measure).filterArr

    $col = $('#'+(tab.caption+measure.caption+temp_current.caption).clean());
    $col.attr("id", (tab.caption+measure.caption+temp_alt.caption).clean())
    $col.attr( "level", null )
    $col.attr( "drilldowncurrent", null )
    
    createDimensionsForMeasure({
        'tab_key': tab_key,
        'measure_key':measure_key,
        'only_update_this_dim_key':''+from_dim_key,
        'filterArr': filterArr,
        'changeDimension': true
    });

    updateAltDimensionLabels(tab_key, measure_key, from_dim_key, to_alt_dim_key);
}

function createDimensionsForMeasure(params) {
    params = params || {};
    measure_key = params.measure_key;
    tab_key = params.tab_key;
    dimension_key = params.dimension_key || null;
    dimension_key_not_updatable = params.dimension_key_not_updatable || null;
    reloading = params.reloading || false;
    filterArr = params.filterArr || [];
    only_update_this_dim_key = params.only_update_this_dim_key || false;

    if (measure_key == null || tab_key == null) {
        measure_key = $(this).attr('measure');
        tab_key = $(this).attr('tab');
    }
    tab = tabs[tab_key];
    measure = tab.measures[measure_key];
    $divTargetTables = $('#tables .row');
    semaphoreDimensions  = 0, all_queued_dimensions = false;

    if (filterArr.length == 0 && !reloading) {
        // $divTargetTables.empty();
        // Build tables
        if(dimension_key == null && !only_update_this_dim_key) {
            $divTargetTables.empty();
        }
        for (var dim_key in measure.dimensions) {
            if(only_update_this_dim_key) {
                if(dim_key != only_update_this_dim_key)
                    continue;
            }
            if (dim_key != dimension_key && dimension_key_not_updatable != dim_key) {
                var dimension = measure.dimensions[dim_key];
                $col = $('#'+(tab.caption+measure.caption+dimension.caption).clean());

                level = null;
                drillDown = false;
                colDrillDownName = null;
                if($col.attr('level') != null && !only_update_this_dim_key) {
                    level = parseInt($col.attr('level'));
                    drillDown = true
                    colDrillDownName = getDrillDownName($col);
                }

                if ($col.length == 0) {
                    $col = $('<div class="col-md-'+dimension.columns+' col-no-padding pull-left" id='+(tab.caption+measure.caption+dimension.caption).clean()+'/>');
                    $col = $col.append('<div class="clearfix visible-xs-block visible-sm-block visible-md-block"></div>');
                    $col.addClass('table-loading');
                    $col.append($('<div class="spinner"/>'));
                    $divTargetTables.append($col);
                } else {
                    $col.find('.panel-body').empty();
                    $col.find('.panel-body').append($('<div class="spinner"/>'));
                }
                query = makeQuery({
                    'measure': measure,
                    'dimension': dimension,
                    'tab': tab,
                    'drillDownName': colDrillDownName,
                    'drillDown': drillDown
                });
                query.measure.key = measure_key;
                query.tab.key = tab_key;
                query.dimension.key = dim_key;
                if(drillDown && !only_update_this_dim_key) {
                    query.drillDownCurrent = colDrillDownName;
                    query.level = level;
                }
                semaphoreDimensions++;
                new QueryBuilder(query, successDimension, popDimension).run();

            }
        }

    } else {
        for (var dim_key in measure.dimensions) {
            if(only_update_this_dim_key) {
                if(dim_key != only_update_this_dim_key)
                    continue;
            }
            if(dim_key != dimension_key && dim_key != dimension_key_not_updatable) {
                var dimension = measure.dimensions[dim_key];
                var $col = $('#'+(tab.caption+measure.caption+dimension.caption).clean());
                level = null;
                drillDown = false;
                colDrillDownName = null;
                if($col.attr('level') != null && !only_update_this_dim_key) {
                    level = parseInt($col.attr('level'));
                    drillDown = true
                    colDrillDownName = getDrillDownName($col);
                }

                $col.find('.panel-body').empty();
                $col.find('.panel-body').append($('<div class="spinner"/>'));
                filteredWith = [];

                if (filterArr) {
                    filteredWith = filterArr.slice(0).filter(function (el) {
                        return el.dimension.caption != dimension.caption;
                    });
                }
                if(filteredWith) {
                    query = makeQuery({
                        'measure': measure,
                        'dimension': dimension,
                        'tab': tab,
                        'filteredWith': filteredWith,
                        'drillDownName': colDrillDownName,
                        'drillDown': drillDown
                    });
                    query.measure.key = measure_key;
                    query.tab.key = tab_key;
                    query.dimension.key = dim_key;
                    query.filteredCurrent = filterArr;
                    if(drillDown && !only_update_this_dim_key) {
                        query.drillDownCurrent = colDrillDownName;
                        query.level = level;
                    }
                    semaphoreDimensions++;
                    new QueryBuilder(query, successDimension).run();
                }
            }
        }
    }
    all_queued_dimensions = true;
}

function hasOverflow(e) {
    return (e[0].scrollWidth > e[0].clientWidth);
}

$(document).on('mouseenter', ".caption, .measure-caption, .option-label", function(e) {
    var $this = $(this);
    if(hasOverflow($this)) {
        $this.tooltip({
            title: $this.text(),
            placement: "bottom",
            trigger: 'hover'
        });
        $this.tooltip('show');
    }
});


$(document).on('mouseenter', ".display, .panel-heading", function(e) {
    var $this = $(this);
    if($this.attr('tooltip')) {
        $this.tooltip({
            title: $this.attr('tooltip'),
            placement: "top",
            trigger: 'hover'
        });
        $this.tooltip('show');
    }
});

function initTabFunctions() {
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        $.sparkline_display_visible();
        tab_key = $(this).attr('tab');
        tab = tabs[tab_key];
        $('#tables .row').empty();
        currentFiltersGlobal = []
        updateMeasure({'tab_key': tab_key, 'initial_measure_key': 0});
    });
}

redrawSparkline = function() {
    renderSparkline('spark-dimension');
    renderSparkline('spark-measure');
}
tweakProgressBar = function() {
    $('.bar-default span').each(function(){
        if($(this).width() > $(this).parent().width()){
            $(this).css("color", '#aaa');
            $(this).css("position", "relative");
            $(this).css("left",$(this).parent().width()+2+"px");
        } else {
            $(this).css("color","");
            $(this).css("position", "");
            $(this).css("left", "");
        }
    });
}

var sparkResize;
var progressbarResize;
$(window).resize(function(e) {
    clearTimeout(sparkResize);
    clearTimeout(progressbarResize);
    sparkResize = setTimeout(redrawSparkline, 200);
    progressbarResize = setTimeout(tweakProgressBar, 200);
});

