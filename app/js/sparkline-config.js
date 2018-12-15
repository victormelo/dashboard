SPARKLINE_CONFIG = {};

callback = function(sparkline, options, point) {
    fmt = $(sparkline.el).data('format')
    value = format(fmt, point.y)
    u12Months = $(sparkline.el).data('u12Months');
    month = point.x;
    date = '({monthName}/{year})'.formatParams({
        'monthName': monthNames[u12Months[month].month()],
        'year': u12Months[month].year()
    });

    return "<div class=\"jqsfield\"><span style=\"color: " + point.color + "\">&#9679;</span> "
        + value + " " + date + "</div>";
}

SPARKLINE_CONFIG['spark-dimension'] = {
    width:'100%',
    height:'18px',
    type: 'line',
    lineColor: '#8da4af',
    highlightSpotColor: '#8da4af',
    fillColor: null,
    lineWidth: 1,
    spotRadius: 2,
    drawNormalOnTop: false,
    spotRadius: 2,
    lastSpot: true,
    tooltipFormatter: callback,
    tooltipOffsetX: -85,
    tooltipOffsetY: 20
};

SPARKLINE_CONFIG['spark-measure'] = {
    width:'100%',
    height:'25px',
    type: 'line',
    lineColor: '#ffffff',
    fillColor: null,
    highlightSpotColor: '#ffffff',
    spotLineColor: '#fff',
    lineWidth: 1,
    spotRadius: 2,
    drawNormalOnTop: false,
    tooltipFormatter: callback
};
