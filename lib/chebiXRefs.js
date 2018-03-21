
let prefixes = {
    'CAS': null,
    'DrugBank': 'http://www.drugbank.ca/drugs/',
    'Reaxys': null,
    'YMDB': null,
    'Gmelin': null,
    'PMID': 'http://www.ncbi.nlm.nih.gov/pubmed/',
    'PDBeChem': null,
    'HMDB': null,
    'Beilstein': null,
    'KEGG': null
}

export function extractXRefs(chebiRecord) {

	var xrefs = []

    let term = chebiRecord.terms[0]

    xrefs.push(term.iri)

    for(let xref of term.obo_xref) {

        let type = xref.database
        let id = xref.id

        let uri = dbrefToURI(type, id)

        if(uri)
            xrefs.push(uri)
    }

    return xrefs
}


function getPrefix(type) {
     return prefixes[type] || null
}

export function dbrefToURI(type, id) {

    let prefix = getPrefix(type)

    if(!prefix)
        return null

    return prefix + id
}

export function uriToDbref(uri) {

    for(let k in prefixes) {

        let prefix = prefixes[k]

        if(uri.indexOf(prefix) === 0) {

            let id = uri.slice(prefix.length)

            return { type: k, id: id }
        }

    }

    return null


}



