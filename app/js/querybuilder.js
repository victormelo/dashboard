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
