PENTAHO_URL = "/pentaho/Xmla";

MEASURE_MEASURE = 0
VARIACAO_MEASURE = 1
TENDENCIA_MEASURE = 2

function getColumns(row, query) {
    var offset = query.level || 0;
    var offsetMeasures = 0;

    if( query.dimension.additionalMeasures) {
        offsetMeasures = query.dimension.additionalMeasures.length;
    }
    // Tamanho de rows de consulta normal
    extra_captions = []
    for (var i = 0; i < offset; i++) {
        extra_captions.push(i);
    }
    minusMeasure = !query.dimension.visualizationOptions.showDataBar;
    minusVariacao = !query.dimension.visualizationOptions.showYearlyVariation;
    minusTendencia = !query.dimension.visualizationOptions.showTrendLine;

    return {CAPTION: 0+offset,
            NAME: 1+offset,
            MEASURE: 2+offset,
            VARIACAO: 3+offset - minusMeasure + offsetMeasures,
            TENDENCIA: 4+offset - minusVariacao - minusMeasure + offsetMeasures,
            EXTRA_CAPTIONS: extra_captions};
}

function preprocessNumber(number) {
    if (number != null) {
        try {
            preprocessed = parseFloat(number.toFixed(2));
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
        GET[nv[0]] = nv[1] || true;
    }
}

tabs = null;

console.log(GET);
d = GET.d || 'ovvt';
jsonURL = '/pentaho/plugin/ppa/api/dashmd?paramd={d}'.formatParams({'d': d});
console.log(jsonURL)
// $.get( "dash.json", function( data ) {
$.getJSON(jsonURL, function( data ) {
    tabs = data.tabs;
    global_filters = data.filters
    buildTabs(tabs, global_filters);
    try {
        buildAnchors(data.dashOptions.links, global_filters);
    } catch(err) {
        console.log('no anchor links defined');
    }
    // setInterval(reload, data.dashOptions.refreshTime*1000);

});

function buildAnchors(links, global_filters) {
    $target = $('#app');
    for (var link_key in links) {
        var link = links[link_key];
        $target.append('<a href="javascript:void(0)" anchorUrl='+link.anchorUrl+' class="anchor">'+link.caption+'</a>')
        $target.append(
        '<div class="modal fade" tabindex="-1" role="dialog" id="'+link.caption.clean()+'"> \
          <div class="modal-dialog modal-lg" role="document"> \
            <div class="modal-content"> \
                <div class="modal-header"> \
                    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button> \
                </div> \
                <div class="modal-body"> \
                    <iframe src="" style="zoom:0.60" width="99.6%" height="768px" frameborder="0"></iframe> \
                </div> \
            </div> \
          </div> \
        </div>');
    }

    $('.anchor').click(function() {
        $this = $(this);
        url = $this.attr('anchorUrl');

        var indices = [];
        for(var i=0; i<url.length;i++) {
            if (url[i] === "*") indices.push(i);
        }
        for (var i = indices.length - 1; i >= 0; i--) {
            var global_filter = global_filters[i];
            var dimMember = $('#'+global_filter.name).find('option:selected').attr('mn');
            url = url.removeAt(indices[i], 1);

            if(dimMember)
                url = url.insert(indices[i], escape(dimMember));
        }
        $this = $(this)
        $('#'+$this.text().clean()).modal('show');
        $('#'+$this.text().clean()).on('shown.bs.modal', function () {
            $('#'+$this.text().clean() + ' iframe').attr("src", url);
        });

    });
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
var start = moment().startOf('month');
var end = moment();

function reload() {
    selected = $('.measure-selected');
    measure_key = selected.attr('measure');
    tab_key = selected.attr('tab');
    tab = tabs[tab_key];
    measure = tab.measures[measure_key];
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
            // "format": "DD/MM/YYYY",
            // "separator": " - ",
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
           last12: [moment().subtract(13, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
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
    f = getDimensionFilters(measure, exclude=dimension_key);
    filterArr = f.filterArr;
    excluded = f.excluded;
    $dimensionData = $('#'+(tab.caption+measure.caption+dimension.caption).clean());
    selectedLevel = parseInt($(this).attr('level'));
    current = $dimensionData.attr('drilldowncurrent');

    // selectedLevel+1 because we are using 0-index, and the last +1 is to care care of the index of -> ]
    targetIndex = current.nthIndexOf('].', selectedLevel+1) + 1
    targetName = current.substring(0, targetIndex);

    $dimensionData.attr('level', selectedLevel);
    $dimensionData.attr('drilldowncurrent', targetName);

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
            'filter': filterArr.slice(0),
            'initial_measure_key': measure_key,
            'initial_dimension_key': dimension_key
        });
    }
}

function makeQuery(params) {
    dimension = params.dimension || null;
    tab = params.tab || null;
    measure = params.measure || null;
    filteredWith = params.filteredWith || [];
    drillDown = params.drillDown || false;
    drillDownName = params.drillDownName || null;
    topclausule = '';
    selectComplement = '';
    mn = '';
    selectMn = '';

    selectMainMeasure = 'Measures.[{olapMeasure}]'.formatParams({'olapMeasure': measure.olapMeasure});
    selectYearlyVariation = 'Measures.[Variacao Anual]';
    selectTrendline = 'Measures.TendenciaU12M';

    select = [selectMainMeasure, selectYearlyVariation, selectTrendline].join(', ');

    if ($('#reportrange').length > 0) {
        startdate = $('#reportrange').data('daterangepicker').startDate;
        enddate = $('#reportrange').data('daterangepicker').endDate;
    } else {
        startdate = start.clone();
        enddate = end.clone();
    }

    startLastYear = startdate.clone().subtract(1, 'year');
    endLastYear = enddate.clone().subtract(1, 'year');
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
            dimensionName = params.dimensionName || null;
            drillDownCurrent = params.drillDownCurrent || null;

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

                // dimHierarchy = '{drillDownCurrent}'.formatParams(
                                    // {'drillDownCurrent': drillDownCurrent});
                selectComplement = ', non empty {dim} on 1'.formatParams(
                                    {'dim': dim});

            } else if(drillDownName) {
                dim = drillDownName+'.Children'
                selectComplement = ', non empty {dim}.Children on 1'.formatParams(
                                {'dim': dim});

            }
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
    $selects = $('.filter-tab select:visible');
    $selects.each(function() {
        dimMember = $(this).find('option:selected').attr('mn');
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

        filts = []

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
            filt = 'CrossJoin({filt1}, {filt2})'.formatParams({'filt1':filt1, 'filt2':filt2});
            if (dimlen > 2) {
                for (var i = 2; i < dimlen; i++) {
                    morefilt = filts[i];
                    filt = crossJoin(filt, morefilt);
                }
            }
        }
        if (filts.length > 0) {
            where = 'where CrossJoin( \
            {{dateFilter}}, \
            {filter})'.formatParams({
                'dateFilter':dateFilter, 'filter' : filt
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

    query = 'with \
                member Measures.atual as \
                    Sum({[{dateDimension}].[{startyear}].[{startmonth}].[{startday}] : [{dateDimension}].[{endyear}].[{endmonth}].[{endday}]}, \
                    Measures.[{olapMeasure}]) \
                member Measures.anterior as \
                    Sum({[{dateDimension}].[{startyearLastY}].[{startmonthLastY}].[{startdayLastY}] : \
                    [{dateDimension}].[{endyearLastY}].[{endmonthLastY}].[{enddayLastY}]}, Measures.[{olapMeasure}]) \
                member Measures.[Variacao Anual] as \
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
                'startyearLastY': startLastYear.year(),'startmonthLastY': startLastYear.month()+1,'startdayLastY': startLastYear.date(),
                'endyearLastY': endLastYear.year(),'endmonthLastY': endLastYear.month()+1,'enddayLastY': endLastYear.date(),
                'startyearU12': startU12.year(),'startmonthU12': startU12.month()+1,
                'endyearU12': endU12.year(),'endmonthU12': endU12.month()+1, 'select': select
            });

    return {'query': query, 'measure': measure, 'dimension': dimension, 'tab': tab, 'filter': filteredWith, 'u12Months': u12Months}
}

function successDimension(xmla, options, response, query) {
    rows = response.fetchAllAsArray();
    if(query.dimension.visualizationType == 'table') {
        tableId = buildTable({'query':query, 'rows':rows});
        initTableEvents(tableId);
        renderSparkline('spark-dimension');
        tweakProgressBar();
    } else if(query.dimension.visualizationType == 'barchart') {
        buildBarchart({'query':query, 'rows':rows})
    }

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
    buildMeasure(query, rows);

    renderSparkline('spark-measure');

    if(query.selectMeasure) {
        selectMeasureKey(query.tab.key, query.initial_measure_key, query);
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

};


function buildTabs(tabs, global_filters) {
    $tables = $('<div id="tables"><div class="row"></</div>');
    for (var tab_key in tabs) {
        var tab = tabs[tab_key];
        $target = $('#app .nav-tabs');
        active = tab_key == 0 ? 'active' : '';
        $li = '<li class="' + active + '"> \
                <a href="#'+ tab.caption.clean() +'" tab="'+ tab_key +'" data-toggle="tab" aria-expanded="true">'+tab.caption+'</a></li>'

        $targetPane = $('#app .tab-content');
        active = tab_key == 0 ? 'active in' : ''
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
        $target.append($li);
        if (tab_key == 0) {
            updateMeasure({'tab_key': tab_key, 'initial_measure_key': 0});
        }

    }
    for (var global_filter_key in global_filters) {
        var global_filter = global_filters[global_filter_key];
        $target.append('<li class="filter-tab"> \
            <select hierarchy="'+global_filter.olapDimHierarchy+'" \
            level="'+global_filter.olapDimLevel+'" id="'+ global_filter.name +'"> \
              <option>('+ global_filter.caption +')</option> \
            </select></li>');
    }
    measure = tabs[0].measures[0];
    updateGlobalFilters(measure, true);
    $('.filter-tab select').on('change', reload);

    $target.append('<li class="datepicker-tab"><div id="reportrange"><i class="fa fa-calendar"></i> <span></span></div></li>');
    initDatePicker();
    initTabFunctions();
    $targetPane.append($tables);
};

function buildGlobalFilters(params) {
    query = params.query || null;
    rows = params.rows || null;
    $select = $('#'+query.global_filter.name);

    $select.parent().show();
    $select.empty();
    $select.append('<option>('+ query.global_filter.caption +')</option>');

    for (var row_key in rows) {
        var row = rows[row_key];
        $option = $('<option mn="'+ row[1] +'">'+ row[0] +'</option>')
        $select.append($option);
    }

    initialValue = query.global_filter.initialValue;
    if(initialValue) {
        var $option = undefined;
        if(initialValue.olapDimMember) {
            $option = $select.find('option[mn="'+initialValue.olapDimMember+'"]');
        } else if(initialValue.first) {
            $option = $($select.find('option')[1]);
        }

        if($option)
            $select.val($option.val());

    }

}

function successGlobalFilters(xmla, options, response, query) {
    rows = response.fetchAllAsArray();
    buildGlobalFilters({'query':query, 'rows':rows});
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
            // $select.val($select.find('option:first').val());
            $select.parent().hide();
        } else if(rebuild) {
            query = makeGlobalFilterQuery(global_filter, measure);
            new QueryBuilder(query, successGlobalFilters).run();
        } else {
            $select.parent().show();
        }
    }
}

function makeGlobalFilterQuery(global_filter, measure) {
    globalOptions = measure.globalFiltersOptions;

    query = 'with member Measures.mn as [{olapDimHierarchy}].CurrentMember.Name \
                select {Measures.mn} on 0, \
            {[{olapDimHierarchy}].[{olapDimLevel}].Members} on 1 \
            from [{olapCube}]'.formatParams({
                'olapDimHierarchy': measure.olapDimHierarchy,
                'olapDimLevel': global_filter.olapDimLevel,
                'olapCube': measure.olapCube
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
        return numeral(parseFloat(x)).format(query.measure.numberFormat)
    }).join(', ');
}

function buildMeasure(query, rows) {
    row = rows[0];
    $target = $('#' + (query.tab.caption+query.measure.caption).clean());
    $target.empty();
    // $a=$('<a class="measure-loader" href="javascript:void(0)" \
        // measure="'+ query.measure.key +'" tab="'+ query.tab.key +'">LOAD</a>');

    variacao_measure = row[VARIACAO_MEASURE];
    variation = parseInt(preprocessNumber(variacao_measure));
    sign = getVariationSign(query.measure, variation);

    $display = $('<div class="display"/>');
    $number = $('<div class="number"/>');
    measure_measure = preprocessNumber(row[MEASURE_MEASURE]);
    measure_measure = numeral(measure_measure).format(query.measure.numberFormat);

    // variation = numeral(variation).format(query.measure.numberFormat);
    $variation = $('<small class="variation-right pull-right"><i class="fa fa-lg fa-caret-'+sign+'" aria-hidden="true"></i> '+variation+'%</small>');

    $target.append($variation);
    $target.append($('<div class="clearfix" />'));
    $target.append($display);
    $display.append($number);

    $measure_measure = $('<div class="measure-measure">'+measure_measure+'</div>');
    $measure_caption = $('<div class="measure-caption"> '+ query.measure.caption +' \ </div>');
    $number.append($measure_caption);
    $number.append($measure_measure);

    $graph = $('<div class="graph"/>');
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

    $card = $('<div class="card-measure"/>');
    $target.append($card);
    $card.append($graph);
    // $card.append($a);
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
function getDimensionFilters(measure, exclude) {
    filterArr = [];

    excluded = false;
    if(exclude != null) {
        $elems = $('.dimension-selected:not([dimension="'+ exclude +'"])');
        excluded = $('.dimension-selected[dimension="'+ exclude +'"]').length > 0;
    } else {
        $elems = $('.dimension-selected');

    }

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
    height = query.dimension.rows*(115) - 43 - 15;

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
    console.log(rows);
    console.log(categories);
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

    $panelHeading = $('<div class="panel-heading" style="background-color:'+color+'"/>');
    // $icon = $('<i class="fa fa-bar-chart-o fa-fw"></i>');
    caption = ' ' + query.measure.caption + ' por ' + query.dimension.caption;
    // $panelHeading.append($icon);
    $panelHeading.append(caption);
    // 4*145 = 580 = 623
    // 2*145 = 290 = 333
    height = query.dimension.rows*(115) - 43 - 15;// - 30;
    $panelBody = $('<div class="panel-body pre-scrollable scrollingbar" style="min-height: '+ height +'px;">');
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
    if(query.dimension.visualizationType==='table') {
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
        if (query.dimension.additionalMeasures && rows.length>0) {
            var additionalMeasure_columns = Math.trunc(measure_columns / 2);
            measure_columns /= 2;
            if(query.dimension.visualizationOptions.showDataBar) {
                $row = $('<div class="row row-header"/>')
                for (var i = 0; i <= qtyMeasures; i++) {
                    if (i == 0) {
                        $colBar = $('<div class="col-xs-'+measure_columns+' col-xs-offset-'+caption_columns+' col-no-padding "/>');
                        $colBar.append(query.measure.caption)
                    } else {
                        $colBar = $('<div class="col-xs-'+additionalMeasure_columns+' col-no-padding "/>');
                        $colBar.append(query.dimension.additionalMeasures[i-1].caption);
                    }

                    $row.append($colBar);

                }
                $container.append($row);
            }
        } else if(rows.length>0) {
            $row = $('<div class="row row-header"/>')
            if(query.dimension.visualizationOptions.showDataBar) {
                $colBar = $('<div class="col-xs-'+measure_columns+' col-xs-offset-'+caption_columns+' col-no-padding "/>');
                $colBar.append(query.measure.caption)
                $row.append($colBar);

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


    } else {

    }

    for (var row_key in rows) {
        var row = rows[row_key];
        selected=''
        if (query.filteredCurrent) {
            checkequals = query.filteredCurrent.filter(function(e) {
                return e.name == row[idx.NAME]
            });
            if (checkequals.length > 0) {
                selected='dimension-selected';
            }
        }
        isCaption = row[idx.CAPTION] ? true : false
        captionText = isCaption ? row[idx.CAPTION] : row[idx.NAME];
        selectable = isCaption ? 'selectable' : '';
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

            for (var i = 0; i <= qtyMeasures; i++) {
                $colBar = $('<div class="col-xs-'+measure_columns+' col-no-padding "/>');
                measure = numeral(preprocessNumber(row[idx.MEASURE+i])).format(query.measure.numberFormat);

                $colBar.append($('<div class="progress"/>').append(
                '<div class="progress-bar bar-default" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"\
                    style="width: '+ (row[idx.MEASURE+i]/max_measures[i])*100 +'%; background-color: '+ color +'"><span>'+measure+'</span></div>'));

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
        // }
    });
    // $(tableId + " .table-box .selectable").unbind('click');
    $(tableId + ' .table-box .selectable .drilldown-link').click(function(e) {
        e.stopPropagation();
        doDrillDown($($(this).parent().parent()));
    });
}
function doDrillDown(elem) {
    tab = tabs[elem.attr('tab')];
    measure = tab.measures[elem.attr('measure')];
    dimension = measure.dimensions[elem.attr('dimension')];
    f = getDimensionFilters(measure, exclude=elem.attr('dimension'));
    filterArr = f.filterArr
    excluded = f.excluded

    $dimensionData = $('#'+(tab.caption+measure.caption+dimension.caption).clean());
    drillDownCurrent = $dimensionData.attr('drilldowncurrent');
    level = $dimensionData.attr('level');
    level = parseInt($dimensionData.attr('level'));
    level += 1;

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
            'filter': filterArr.slice(0),
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
function createDimensionsForMeasure(params) {
    params = params || {};
    measure_key = params.measure_key;
    tab_key = params.tab_key;
    dimension_key = params.dimension_key || null;
    dimension_key_not_updatable = params.dimension_key_not_updatable || null;
    reloading = params.reloading || false;
    filterArr = params.filterArr || [];

    if (measure_key == null || tab_key == null) {
        measure_key = $(this).attr('measure');
        tab_key = $(this).attr('tab');
    }
    tab = tabs[tab_key];
    measure = tab.measures[measure_key];
    $divTargetTables = $('#tables .row');
    if (filterArr.length == 0 && !reloading) {
        // $divTargetTables.empty();
        // Build tables
        if(dimension_key == null) {
            $divTargetTables.empty();
        }
        for (var dim_key in measure.dimensions) {
            if (dim_key != dimension_key && dimension_key_not_updatable != dim_key) {
                var dimension = measure.dimensions[dim_key];
                $col = $('#'+(tab.caption+measure.caption+dimension.caption).clean());
                level = null;
                drillDown = false;
                colDrillDownName = null;
                if($col.attr('level') != null) {
                    level = parseInt($col.attr('level'));
                    drillDown = true
                    colDrillDownName = getDrillDownName($col);
                }

                if ($col.length == 0) {
                    $col = $('<div class="col-md-'+dimension.columns+' col-no-padding" id='+(tab.caption+measure.caption+dimension.caption).clean()+'/>');
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
                if(drillDown) {
                    query.drillDownCurrent = colDrillDownName;
                    query.level = level;
                }
                new QueryBuilder(query, successDimension).run();

            }
        }

    } else {
        for (var dim_key in measure.dimensions) {
            if(dim_key != dimension_key && dim_key != dimension_key_not_updatable) {
                var dimension = measure.dimensions[dim_key];
                var $col = $('#'+(tab.caption+measure.caption+dimension.caption).clean());
                level = null;
                drillDown = false;
                colDrillDownName = null;
                if($col.attr('level') != null) {
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
                    if(drillDown) {
                        query.drillDownCurrent = colDrillDownName;
                        query.level = level;
                    }
                    new QueryBuilder(query, successDimension).run();
                }
            }
        }
    }
}

function hasOverflow(e) {
    return (e[0].scrollWidth > e[0].clientWidth);
}

$(document).on('mouseenter', ".caption, .measure-caption", function(e) {
    var $this = $(this);
    if(hasOverflow($this)) {
        $this.tooltip({
            title: $this.text(),
            placement: "right",
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

