function QueryBuilder(query, successFunction, errorFn) {
    this.query = query;
    this.successFunction = successFunction;
    var that = this;
    this.callback = function (xmla, options, response) {
        that.successFunction(xmla, options, response, that.query);
    };
    this.errorFn = errorFn
};

QueryBuilder.prototype.run = function(){
    var thisone = this;
    var xmla = new Xmla({
        async: true,
        listeners: {
            events: Xmla.EVENT_ERROR,
            handler: function(eventName, eventData, xmla){
                if (thisone.errorFn) 
                    thisone.errorFn()
                var details = '';
                if (thisone.query.dimension) {
                    details = 'Erro ao executar consulta à  '+thisone.query.dimension.caption+' por '+ thisone.query.measure.caption;
                } else if(thisone.query.global_filter) {
                    details = 'Erro ao executar consulta à ' + thisone.query.global_filter.caption;
                } else if(thisone.query.measure.caption) {
                    details = 'Erro ao executar consulta à  ' + thisone.query.measure.caption;
                } else {
                    details = 'Erro ao executar a consulta';
                }
                desc = $(xmla.responseXML).find("desc").text()
                if(desc) {
                    desc = "<br><br>" + desc
                } else {
                    desc = ''
                }
                $.toast({
                    heading: 'Oops',
                    text: details + desc,
                    position: 'bottom-right',
                    icon: 'error',
                    hideAfter: 8000
                })
            }
        }
    });

    try {
        catalog = this.query.measure.olapCatalog;
    } catch(err) {
        catalog = this.query.olapCatalog;
    }

    try {
        response = xmla.execute({
            async: true,
            url: PENTAHO_URL,
            statement: this.query.query,
            properties: {DataSourceInfo: "Pentaho Mondrian",
            Catalog: catalog,
            Format: "Tabular"},
            success: this.callback
        });
    }
    catch(err) {
        response = null;
        console.log('error');
        // return null;
    } finally {
        return response;
    }
};
