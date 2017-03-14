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
