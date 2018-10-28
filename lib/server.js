
import LDFServer, { BOUND, UNBOUND } from 'ldf-facade'

import bodyParser from 'body-parser'

import getConfig from '@bioenrichment/config'
import { eriToURIs, urisToERI } from '@bioenrichment/xrefdb-client'

import request from 'request-promise'


const uniprotPrefix = 'http://www.uniprot.org/uniprot/'

import libxmljs from 'libxmljs'

const chebiPrefix = 'http://purl.obolibrary.org/obo/CHEBI_'

const server = new LDFServer()

import { extractXRefs } from './chebiXRefs'

import { Predicates } from 'bioterms'

import cache from 'idiot-cache'


/* Add a custom getXRefs endpoint (part of enrichment but not part of the
 * default LDF server)
 */
server.app.post('/getXRefs', bodyParser.json(), async (req, res) => {

	var uris = []

    console.log(JSON.stringify(req.body))

	for(let uri of req.body.uris) {

		if(uri.indexOf(chebiPrefix) === 0) {

			let chebiID = uri.slice(chebiPrefix.length)

			let chebiRecord = await loadChebiJSON(chebiID)

			let xrefs = extractXRefs(chebiRecord)

			uris = uris.concat(xrefs)

			break
		}

	}

	res.send(JSON.stringify({
		uris: uris
	}))
})

async function loadChebiJSON(chebiID) {

    let result = await cache(chebiID, 10000, async () => {
        
        return await request({
            url: 'https://www.ebi.ac.uk/ols/api/ontologies/chebi/terms?iri=http://purl.obolibrary.org/obo/CHEBI_' + chebiID,
            proxy: getConfig().proxy
        })

    })

    return JSON.parse(result)._embedded
}




/* <uri> ?p ?o
 * Describe a subject
 */
server.pattern({

    s: BOUND,
    p: UNBOUND,
    o: UNBOUND

}, async (state, pattern) => {

	const config = getConfig()

    /* If we are looking for an enrichment URI
     */
	if(pattern.s.indexOf(config.eriPrefix) === 0) {

        /* Get the URIs that this enrichment URI represents (xrefs)
         * We are looking for a CHEBI URI.
         */

        let uris = await eriToURIs(pattern.s)

        for(let uri of uris) {

            if(uri.indexOf(chebiPrefix) === 0) {

                let chebiID = uri.slice(chebiPrefix.length)

                let triples = await chebi2sybiont(pattern.s, chebiID) 

                return { triples, total: triples.length, nextState: null }
            }

        }

        return { total: 0 }

	} else {

        return { total: 0 }

    }


})

server.listen(9876)


async function chebi2sybiont(s, chebiID) {

    let chebiRecord = await loadChebiJSON(chebiID)

    let term = chebiRecord.terms[0]

    return [
            { s, p: Predicates.Dcterms.title, o: term.label, datatype: 'string' },
            { s, p: Predicates.Dcterms.description, o: (term.description || []).join(';'), datatype: 'string' }
    ]
}




