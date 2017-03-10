PENTAHO_URL = "/pentaho/Xmla";

MEASURE_MEASURE = 0
VARIACAO_MEASURE = 1
TENDENCIA_MEASURE = 2

function getColumns(row, offset) {
    var offset = offset || 0;
    // Tamanho de rows de consulta normal
    extra_captions = []
    for (var i = 0; i < offset; i++) {
        extra_captions.push(i);
    }
    return {CAPTION: 0+offset, NAME: 1+offset, MEASURE: 2+offset, VARIACAO: 3+offset, TENDENCIA: 4+offset, EXTRA_CAPTIONS: extra_captions};
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


String.prototype.clean = function() {
    return this.replace(/ /g,'').replace(/[^\w\s]/gi, '')
}

String.prototype.nthIndexOf = function(pattern, n) {
    var i = -1;

    while (n-- && i++ < this.length) {
        i = this.indexOf(pattern, i);
        if (i < 0) break;
    }

    return i;
}

String.prototype.format = function (){
    var args = arguments;
    return this.replace(/\{\{|\}\}|\{(\d+)\}/g, function (curlyBrack, index) {
        return ((curlyBrack == "{{") ? "{" : ((curlyBrack == "}}") ? "}" : args[index]));
    });
};

String.prototype.formatParams = function(placeholders) {
    var s = this;
    for(var propertyName in placeholders) {
        var re = new RegExp('{' + propertyName + '}', 'gm');
        s = s.replace(re, placeholders[propertyName]);
    }
    return s;
};
function preprocessNumber(number) {
    if (number != null) {
        return parseInt(number);
    }
    return 0;
}

tabs = null;
// $.get( "dash.json", function( data ) {

console.log(GET);
d = GET.d || 'ovvi';
jsonURL = '/pentaho/plugin/ppa/api/dashmd?paramd={d}'.formatParams({'d': d});
console.log(jsonURL)
$.getJSON(jsonURL, function( data ) {
    tabs = data.tabs;
    buildTabs(tabs);

});

// refer to http://jsfiddle.net/WojtekKruszewski/Zf3m7/22/
var originalLeave = $.fn.popover.Constructor.prototype.leave;
$.fn.popover.Constructor.prototype.leave = function(obj){
    var self = obj instanceof this.constructor ?
    obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type)
    var container, timeout;

    originalLeave.call(this, obj);

    if(obj.currentTarget) {
        container = $(obj.currentTarget).siblings('.popover')
        timeout = self.timeout;
        container.one('mouseenter', function(){
            //We entered the actual popover – call off the dogs
            clearTimeout(timeout);
            //Let's monitor popover content instead
            container.one('mouseleave', function(){
                $.fn.popover.Constructor.prototype.leave.call(self, self);
            });
        });
    }
};

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
        $elem.find('div:not(.caption)').popover({
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
var monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
];
function initDatePicker() {

    $('#reportrange').on('apply.daterangepicker', function(ev, picker) {
        // console.log(picker.startDate.format('YYYY-MM-DD'));
        // console.log(picker.endDate.format('YYYY-MM-DD'));
        selected = $('.measure-selected');
        measure_key = selected.attr('measure');
        tab_key = selected.attr('tab');
        tab = tabs[tab_key];
        measure = tab.measures[measure_key]
        updateMeasure({
            'tab_key': tab_key,
            'filter': filterArr.slice(0),
            'initial_measure_key': measure_key,
            'selectMeasure': true
        });

    });
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
        alwaysShowCalendars: true
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
            'initial_dimension_key': dimension_key,
            'selectMeasure': true
        });
    }
}

function makeFilt(dims, key_dim) {
    filt = dims[key_dim].map(function(x){
        if (x.indexOf('[') < 0) {
            return '[{olapDimHierarchy}].[{name}]'.formatParams({'name': x, 'olapDimHierarchy': key_dim})
        } else {
            return x;
        }
    }).join(", ");

    return '{'+filt+'}';
}
function crossJoin(filt, morefilt) {
    return 'CrossJoin( {filt}, {morefilt})'.formatParams({'filt': filt,
                                                         'morefilt': morefilt});
}
function makeQuery(params) {
    dimension = params.dimension || null;
    tab = params.tab || null;
    measure = params.measure || null;
    filteredWith = params.filteredWith || [];
    drillDown = params.drillDown || false;
    drillDownName = params.drillDownName || null;
    topclausule = '';
    select = '';
    mn = '';
    selectMn = '';
    if ($('#reportrange').length > 0) {
        startdate = $('#reportrange').data('daterangepicker').startDate;
        enddate = $('#reportrange').data('daterangepicker').endDate;
    } else {
        startdate = start.clone();
        enddate = end.clone();
    }

    startLastYear = startdate.clone().subtract(1, 'year');
    endLastYear = enddate.clone().subtract(1, 'year');
    startU12 = enddate.clone().subtract(11, 'month').startOf('month');

    var u12Months = [];
    currentMonth = startU12.clone()
    while (currentMonth.isBefore(enddate)) {
      u12Months.push(currentMonth.clone());
      currentMonth = currentMonth.add(1, "month");
    };

    where = 'where {[{dateDimension}].[{startyear}].[{startmonth}].[{startday}] : \
                    [{dateDimension}].[{endyear}].[{endmonth}].[{endday}]}'.formatParams({
        'dateDimension': measure.dateDimension,
        'startyear': startdate.year(),'startmonth': startdate.month()+1,'startday': startdate.date(),
        'endyear': enddate.year(),'endmonth': enddate.month()+1,'endday': enddate.date()
    });
    if(dimension != null) {
        dim = '[{olapDimHierarchy}].[{olapDimLevel}].Members'.formatParams(
                                {'olapDimHierarchy': dimension.olapDimHierarchy, 'olapDimLevel': dimension.olapDimLevel});
        // dimHierarchy = '[{olapDimHierarchy}]'.formatParams({'olapDimHierarchy': dimension.olapDimHierarchy});
        select = ', non empty Order({dim}, Measures.atual, BDESC) on 1'.formatParams(
                                {'dim': dim});


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
                select = ', non empty {dim} on 1'.formatParams(
                                    {'dim': dim});

            } else if(drillDownName) {
                dim = drillDownName+'.Children'
                select = ', non empty {dim}.Children on 1'.formatParams(
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
            select = ', non empty [Top+Outros] on 1';
        }
        mn = ('member Measures.[mn] as [{olapDimHierarchy}].CurrentMember.Name').formatParams({'olapDimHierarchy': dimension.olapDimHierarchy});
        selectMn = 'Measures.[mn],';
    }

    // Filters
    measure.filters = measure.filters || [];
    defaultFilters = []
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
    // console.log(defaultFilters);
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

        // console.log(filts);
        dimlen = filts.length;
        console.log(filts);
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
            {[{dateDimension}].[{startyear}].[{startmonth}].[{startday}] : \
                        [{dateDimension}].[{endyear}].[{endmonth}].[{endday}]}, \
            {filter})'.formatParams({
                'dateDimension': measure.dateDimension, 'filter' : filt,
                'startyear': startdate.year(),'startmonth': startdate.month()+1,'startday': startdate.date(),
                'endyear': enddate.year(),'endmonth': enddate.month()+1,'endday': enddate.date()
            });
        }

    }
    console.log(where);
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
                    Generate([{dateDimension}].[{startyearU12}].[{startmonthU12}] : [{dateDimension}].[{endyear}].[{endmonth}], \
                    Cast(Measures.[{olapMeasure}] + 0 as String), \", \") \
                    {topclausule} \
                {mn} \
            select {{selectMn} \
                    Measures.[{olapMeasure}], \
                    Measures.[Variacao Anual], \
                    Measures.TendenciaU12M} on 0 \
                    {select} \
                from [{olapCube}] \
            {where}'.formatParams({
                'dateDimension': measure.dateDimension, 'olapMeasure': measure.olapMeasure, 'olapCube': measure.olapCube,
                'topclausule': topclausule, 'select':select, 'mn': mn, 'selectMn': selectMn, 'where': where,
                'startyear': startdate.year(),'startmonth': startdate.month()+1,'startday': startdate.date(),
                'endyear': enddate.year(),'endmonth': enddate.month()+1,'endday': enddate.date(),
                'startyearLastY': startLastYear.year(),'startmonthLastY': startLastYear.month()+1,'startdayLastY': startLastYear.date(),
                'endyearLastY': endLastYear.year(),'endmonthLastY': endLastYear.month()+1,'enddayLastY': endLastYear.date(),
                'startyearU12': startU12.year(),'startmonthU12': startU12.month()+1
            });

    return {'query': query, 'measure': measure, 'dimension': dimension, 'tab': tab, 'filter': filteredWith, 'u12Months': u12Months}
}

function sparklineFormatter(sparkline, options, point, query) {
    value = numeral(point.y).format(query.measure.numberFormat);
    month = point.x;
    date = '({monthName}/{year})'.formatParams({
        'monthName': monthNames[query.u12Months[month].month()],
        'year': query.u12Months[month].year()
    });
    return "<div class=\"jqsfield\"><span style=\"color: " + point.color + "\">&#9679;</span> "
        + value + " " + date + "</div>";
}

function successTable(xmla, options, response, query) {
    rows = response.fetchAllAsArray();
    sparkline_class = buildTable({'query':query, 'rows':rows});
    // Here I just instantiate the sparkline object.
    var maxColor = query.measure.orientation == 'up' ? '#7fe174' : '#fd7159';
    var minColor = query.measure.orientation == 'up' ? '#fd7159' : '#7fe174';
    callback = function (xmla, options, response) {
        return sparklineFormatter(xmla, options, response, query);

    };

    $('.'+sparkline_class).sparkline('html', {
        width:'100%',
        type: 'line',
        lineColor: '#8da4af',
        highlightSpotColor: '#8da4af',
        spotColor: null,
        minSpotColor: minColor,
        maxSpotColor: maxColor,
        fillColor: null,
        lineWidth: 1,
        spotRadius: 3,
        drawNormalOnTop: false,
        tooltipFormatter: callback
    });

};

function successMeasure(xmla, options, response, query) {
    rows = response.fetchAllAsArray();
    sparkline_class = buildMeasure(query, rows);
    // Here I just instantiate the sparkline object.
    var maxColor = query.measure.orientation == 'up' ? '#7fe174' : '#fd7159';
    var minColor = query.measure.orientation == 'up' ? '#fd7159' : '#7fe174';

    callback = function (xmla, options, response) {
        return sparklineFormatter(xmla, options, response, query);
    };

    result = $('.'+sparkline_class).sparkline('html', {
        width:'100%',
        type: 'line',
        lineColor: '#ffffff',
        highlightSpotColor: '#ffffff',
        spotColor: null,
        minSpotColor: minColor,
        maxSpotColor: maxColor,
        fillColor: null,
        lineWidth: 1,
        spotRadius: 3,
        drawNormalOnTop: false,
        tooltipFormatter: callback
    });
    if(query.selectMeasure) {
        selectMeasureKey(query.tab.key, query.measure.key);
    }
    if(query.buildTables) {
        createTablesForMeasure({
            'tab_key': query.initial_tab_key,
            'measure_key': query.initial_measure_key,
            'dimension_key': query.initial_dimension_key,
            'dimension_key_not_updatable': query.dimension_key_not_updatable,
            'filterArr': query.filter});
    }
};


function QueryBuilder(query, successFunction) {
    this.query = query;
    this.successFunction = successFunction;
    var that = this;
    this.callback = function (xmla, options, response) {
        that.successFunction(xmla, options, response, that.query);

    };
};

QueryBuilder.prototype.run = function(){

    xmla = new Xmla();
    try {
        response = xmla.execute({
            async: true,
            url: PENTAHO_URL,
            statement: this.query.query,
            properties: {DataSourceInfo: "Pentaho Mondrian",
            Catalog: this.query.measure.olapCatalog,
            Format: "Tabular"},
            success: this.callback
        });
    }
    catch(err) {
        response = null;
        console.log('error');
        console.log(err.message);
        // return null;
    } finally {
        return response;
    }
};

function buildTabs(tabs) {
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
            $row.append($col);
        }

        $tabpane.append($row);

        $targetPane.append($tabpane);
        $target.append($li);
        if (tab_key == 0) {

            for (var measure_key in tab.measures) {
                var measure = tab.measures[measure_key];
                query = makeQuery({'measure': measure, 'tab': tab});
                query.tab.key = tab_key
                query.measure.key = measure_key
                query.buildTables = true;
                query.initial_tab_key = 0
                query.initial_measure_key = 0
                query.selectMeasure = true
                new QueryBuilder(query, successMeasure).run();
            }
        }

    }

    // $target.append('<li class="datepicker-tab"><i class="fa fa-calendar"></i> <input name="daterange" type="text"/></li>');
    $target.append('<li class="datepicker-tab"><div id="reportrange"><i class="fa fa-calendar"></i> <span></span></div></li>');
    initDatePicker();
    initTabFunctions();
    $targetPane.append($tables);
};

function selectMeasureKey(tab_key, measure_key) {
    $('.measure-loader').removeClass('measure-selected');
    $('.measure-selected').removeClass('measure-selected');
    $($('.measure-loader[measure='+measure_key+'][tab='+tab_key+']')[0]).addClass('measure-selected');
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
    variation = preprocessNumber(variacao_measure);
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

    claz = ('sparklines' + query.measure.caption+query.tab.caption).clean();
    $graph = '<div class="graph"> \
                <span class="'+claz+'"><!--'+row[TENDENCIA_MEASURE]+'--></span> \
              </div>';

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
            'selectMeasure': true
        });
    });
    return claz
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

function buildTable(params) {
    query = params.query;
    var rows = params.rows;
    $col = $('#' + (query.tab.caption+query.measure.caption+query.dimension.caption).clean());
    $col.empty();
    $panel = $('<div class="panel panel-default panel-no-margin"/>');
    $panelHeading = $('<div class="panel-heading"/>');
    // $icon = $('<i class="fa fa-bar-chart-o fa-fw"></i>');
    caption = ' ' + query.measure.caption + ' por ' + query.dimension.caption;
    // $panelHeading.append($icon);
    $panelHeading.append(caption);
    // 4*145 = 580 = 623
    // 2*145 = 290 = 333
    height = query.dimension.rows*(115) - 43 - 15;// - 30;
    $panelBody = $('<div class="panel-body pre-scrollable scrollingbar" style="max-height: '+ height +'px;">');
    $panel.append($panelHeading);
    var idx = getColumns(rows[0], query.level);

    if(idx.EXTRA_CAPTIONS.length > 0) {
        $bread = $('<ul class="breadcrumb"/>');
        $todos = $('<li> <a href="javascript:void(0)" onclick="breadcrumbNavigate.call(this)" class="drillDownLevel caption" level="0" dimension="'+ query.dimension.key +'">Todos</a></li>');
        $bread.append($todos);
        // $panelHeading.append(rows[0][key]);

        for (var i = 0; i < idx.EXTRA_CAPTIONS.length; i++) {
            key = idx.EXTRA_CAPTIONS[i];
            if(key+1 == idx.EXTRA_CAPTIONS.length) {
                $capt = $('<li><span class="caption" level="'+(key+1)+'">'+rows[0][key]+'</span></li>')

            } else {
                $capt = $('<li><a href="javascript:void(0)" onclick="breadcrumbNavigate.call(this)" class="drillDownLevel caption"  dimension="'+ query.dimension.key +'" level="'+(key+1)+'">'+rows[0][key]+'</a></li>')
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

    claz = ('dimension' + query.dimension.caption + query.measure.caption+query.tab.caption).clean();
    max_measure = rows.reduce(function(max, arr) {
        return Math.max(max, arr[idx.MEASURE]);
    }, -Infinity);
    max_measure = max_measure == -Infinity? null : max_measure;
    $container = $('<div class="table-box container-fluid"/>');

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

        $row.append('<div class="col-xs-4 caption">' + captionText + '</div>');

        // Builds the component for the measure - a bar
        $colBar = $('<div class="col-xs-4"/>');
        measure = numeral(preprocessNumber(row[idx.MEASURE])).format(query.measure.numberFormat);

        $colBar.append($('<div class="progress"/>').append(
        '<div class="progress-bar bar-default" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"\
            style="width: '+ (row[idx.MEASURE]/max_measure)*100 +'%">'+measure+'</div>'));
        $row.append($colBar);

        // Builds the component for variation - + sign for positive - sign for negative.
        variation = parseInt(preprocessNumber(row[idx.VARIACAO]))
        sign = getVariationSign(query.measure, variation);
        // variation = query.measure.numberFormat;
        $row.append('<div class="col-xs-2 col-nowrap">' + '<i class="fa fa-lg fa-caret-'+ sign +'" aria-hidden="true"></i> ' + variation + '%</div>');

        // Builds the component for variation - a sparkline
        $spark = $('<div class="col-xs-2"/>').append('<span class="'+claz+'"><!--'+row[idx.TENDENCIA]+'--></span>');

        if (hasDrillDown) {
            initPopover($row, row, query.dimension.drillDownBy, idx, $col);
        }

        $row.append($spark);
        $container.append($row)
    }
    $panelBody.append($container)
    $panel.append($panelBody);
    $col.append($panel);
    $col.removeClass('table-loading');
    $(".table-box .selectable").unbind('click');
    var DELAY = 350, clicks = 0, timer = null;

    $('.table-box .selectable').click(function(e) {
        var $this = $(this);
        wasPopover = $(e.target).hasClass('popover-drill');
        if(!$('.table-loading').length) {
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
                        'initial_dimension_key': $this.attr('dimension'),
                        'selectMeasure': true
                    });

                }, DELAY);
            }

            if(clicks === 1 || wasPopover) {
                clearTimeout(timer);
                timer = null;
                clicks = -1;
                // double click code
                if (dimension.drillDownBy) {
                    tab = tabs[$this.attr('tab')];
                    measure = tab.measures[$this.attr('measure')];
                    f = getDimensionFilters(measure, exclude=$this.attr('dimension'));
                    filterArr = f.filterArr
                    excluded = f.excluded

                    $dimensionData = $('#'+(tab.caption+measure.caption+dimension.caption).clean());
                    drillDownCurrent = $dimensionData.attr('drilldowncurrent');
                    level = $dimensionData.attr('level');
                    level = parseInt($dimensionData.attr('level'));
                    level += 1;

                    if (level <= dimension.drillDownBy[0].levels) {
                        updateTableWithDrillDown({
                            'tab_key': $this.attr('tab'),
                            'measure_key': $this.attr('measure'),
                            'dimension_key': $this.attr('dimension'),
                            'dimensionName': $this.attr('name'),
                            'drillDownCurrent': drillDownCurrent,
                            'level': level,
                            'filter': filterArr.slice(0)
                        });
                    }

                    if(excluded) {
                        updateMeasure({
                            'tab_key': $this.attr('tab'),
                            'filter': filterArr.slice(0),
                            'initial_measure_key': $this.attr('measure'),
                            'initial_dimension_key': $this.attr('dimension'),
                            'dimension_key_not_updatable': $this.attr('dimension'),
                            'selectMeasure': true
                        });
                    }
                }
            }
            clicks++;
        }
    });

    return claz;

};

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
    new QueryBuilder(query, successTable).run();

}

function updateMeasure(params) {
    tab_key = params.tab_key;
    filter = params.filter || [];
    initial_measure_key = params.initial_measure_key;
    initial_dimension_key = params.initial_dimension_key;
    dimension_key_not_updatable = params.dimension_key_not_updatable || null;

    selectMeasure = params.selectMeasure || false;
    for (var measure_key in tabs[tab_key].measures) {
        var measure = tab.measures[measure_key];
        query = makeQuery({'measure': measure, 'tab': tab, 'filteredWith': filter});
        query.filter = filter;
        query.tab.key = tab_key
        query.measure.key = measure_key
        if (measure_key == initial_measure_key) {
            // On the success function the method createTablesForMeasure is called,
            // with those parameters.
            query.buildTables = true;
            query.initial_tab_key = tab_key;
            query.initial_measure_key = initial_measure_key;
            query.initial_dimension_key = initial_dimension_key;
            query.filter = filter;
            query.dimension_key_not_updatable = dimension_key_not_updatable;
            query.selectMeasure = selectMeasure;
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
function createTablesForMeasure(params) {
    params = params || {};
    measure_key = params.measure_key;
    tab_key = params.tab_key;
    dimension_key = params.dimension_key || null;
    dimension_key_not_updatable = params.dimension_key_not_updatable || null;
    filterArr = params.filterArr || [];

    if (measure_key == null || tab_key == null) {
        measure_key = $(this).attr('measure');
        tab_key = $(this).attr('tab');
    }
    tab = tabs[tab_key];
    measure = tab.measures[measure_key];
    $divTargetTables = $('#tables .row');
    if (filterArr.length == 0) {
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
                // console.log($col.attr('level'));
                if($col.attr('level') != null) {
                    level = parseInt($col.attr('level'));
                    drillDown = true
                    colDrillDownName = getDrillDownName($col);
                }

                if ($col.length == 0) {
                    $col = $('<div class="col-lg-4 col-no-padding" id='+(tab.caption+measure.caption+dimension.caption).clean()+'/>');
                    $col = $col.append('<div class="clearfix visible-xs-block visible-sm-block visible-md-block"></div>');
                    $col.addClass('table-loading');

                    $divTargetTables.append($col);
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
                new QueryBuilder(query, successTable).run();

            }
        }

    } else {
        for (var dim_key in measure.dimensions) {
            if(dim_key != dimension_key_not_updatable) {
                var dimension = measure.dimensions[dim_key];
                var $col = $('#'+(tab.caption+measure.caption+dimension.caption).clean());
                level = null;
                drillDown = false;
                colDrillDownName = null;
                // console.log($col.attr('level'));
                if($col.attr('level') != null) {
                    level = parseInt($col.attr('level'));
                    drillDown = true
                    colDrillDownName = getDrillDownName($col);
                }
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
                    new QueryBuilder(query, successTable).run();
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
            placement: "bottom",
            trigger: 'hover'
        });
        $this.tooltip('show');

    }
    // $('.popover').popover('hide');
});




function initTabFunctions() {
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        $.sparkline_display_visible();
        tab_key = $(this).attr('tab');
        tab = tabs[tab_key];
        $('#tables .row').empty();
        updateMeasure({'tab_key': tab_key, 'initial_measure_key': 0, 'selectMeasure': true});
    });
}