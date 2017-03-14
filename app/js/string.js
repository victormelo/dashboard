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
