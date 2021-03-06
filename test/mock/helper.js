'use strict';

var mockHelper = {

	makeRequest: function(uri) {
		var fs = require('fs'),
			fileBody, calledXML;

		switch(uri) {
			case 'full':
				calledXML = 'catalogofull.xml';
				break;
			case 'partial':
				calledXML = 'catalogoparcial.xml';
				break;
			case 'stock':
				calledXML = 'ValorDisponibilidadeEstoque.xml';
				break;
			case 'category':
				calledXML = 'ArvoreDeCategorias.xml';
				break;
		}

		fileBody = fs.readFileSync(__dirname + '/' + calledXML, { encoding: 'utf8' });
		return this.parseBody({ body: fileBody });
	}

};

module.exports = mockHelper;
