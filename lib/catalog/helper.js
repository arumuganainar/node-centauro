'use strict';

var Promise = require('promise'),
	parser = require('xml2js').Parser({
		explicitArray: false,
		valueProcessors: [ (value) => {
			if(value === 'false' || value === 'true') {
				return (value === 'true');
			}

			return value;
		} ]
	}),
	got = require('got'),
	errorHelper = require('../helper'),
	catalogHelper;

catalogHelper = {

	catalogFull: 'http://wsb2b.centauro.com.br/{{partnerName}}/Catalogo/catalogofull.xml',
	catalogPartial: 'http://wsb2b.centauro.com.br/{{partnerName}}/Catalogo/catalogoparcial.xml',
	stockAvailability: 'http://wsb2b.centauro.com.br/{{partnerName}}/DisponibilidadeEstoque/ValorDisponibilidadeEstoque.xml',
	categoryTree: 'http://wsb2b.centauro.com.br/{{partnerName}}/ArvoreCategoria/ArvoreDeCategorias.xml',

	init(partnerName, env) {
		if(env && env === 'development') {
			catalogHelper.catalogFull = catalogHelper.catalogFull.replace('/wsb2b.', '/qaswsb2b.');
			catalogHelper.catalogPartial = catalogHelper.catalogPartial.replace('/wsb2b.', '/qaswsb2b.');
			catalogHelper.stockAvailability = catalogHelper.stockAvailability.replace('/wsb2b.', '/qaswsb2b.');
			catalogHelper.categoryTree = catalogHelper.categoryTree.replace('/wsb2b.', '/qaswsb2b.');
		}

		if(!partnerName) {
			return errorHelper.errorHandler('main', 1);
		}

		catalogHelper.catalogFull = catalogHelper.catalogFull.replace('{{partnerName}}', partnerName);
		catalogHelper.catalogPartial = catalogHelper.catalogPartial.replace('{{partnerName}}', partnerName);
		catalogHelper.stockAvailability = catalogHelper.stockAvailability.replace('{{partnerName}}', partnerName);
		catalogHelper.categoryTree = catalogHelper.categoryTree.replace('{{partnerName}}', partnerName);

		return catalogHelper;
	},

	parseBody(response) {
		var parserPromise = Promise.denodeify(parser.parseString);

		return parserPromise(response.body);
	},

	parseProductObj(mainProductObj) {
		var fullResponse = [];

		if(!mainProductObj.CatalogoProdutos.Produto) {
			return errorHelper.errorHandler('parse', 1);
		}

		if(!Array.isArray(mainProductObj.CatalogoProdutos.Produto)) {
			mainProductObj.CatalogoProdutos.Produto = [ mainProductObj.CatalogoProdutos.Produto ];
		}

		mainProductObj.CatalogoProdutos.Produto.forEach((product) => {
			var productObj = product.$,
				productFinalObj = {};

			productFinalObj.id = productObj.IdProduto;
			productFinalObj.name = productObj.Nome;
			productFinalObj.description = productObj.DescricaoLonga;
			productFinalObj.gender = productObj.Genero;
			productFinalObj.manufacturer = productObj.Fabricante;

			productFinalObj.images = {};
			if(product.Imagens.Imagem.$.ImagemMenor) {
				productFinalObj.images.small = product.Imagens.Imagem.$.ImagemMenor;
			}

			if(product.Imagens.Imagem.$.ImagemMaior) {
				productFinalObj.images.medium = product.Imagens.Imagem.$.ImagemMaior;
			}

			if(product.Imagens.Imagem.$.ImagemZoom) {
				productFinalObj.images.big = product.Imagens.Imagem.$.ImagemZoom;
			}

			productFinalObj.skus = [];
			if(product.Skus.Sku && !Array.isArray(product.Skus.Sku)) {
				product.Skus.Sku = [ product.Skus.Sku ];
			}

			product.Skus.Sku.forEach((sku) => {
				var skuObj = sku.$,
					skuJson = {};

				if(sku.Ean) {
					skuJson.code = parseInt(sku.Ean, 10);
				}

				skuJson.id = skuObj.IdSku;
				skuJson.lastModification = new Date(skuObj.DataModificacao);
				skuJson.enable = (skuObj.Habilitado === 'true');
				skuJson.model = skuObj.Modelo;
				skuJson.size = skuObj.Tamanho;
				skuJson.balance = parseInt((skuObj.Saldo || 0), 10);
				skuJson.price = parseFloat(skuObj.Preco.replace(',', '.'));

				if(skuObj.PrecoDe) {
					skuJson.priceFrom = parseFloat(skuObj.PrecoDe.replace(',', '.'));
				}

				productFinalObj.skus.push(skuJson);
			});

			productFinalObj.categories = [];
			if(product.Categorias.Categoria && !Array.isArray(product.Categorias.Categoria)) {
				product.Categorias.Categoria = [ product.Categorias.Categoria ];
			}

			(product.Categorias.Categoria || []).forEach((categoryObj) => {
				var categoryObj = categoryObj.$,
					categoryJson = {};

				categoryJson.id = categoryObj.Id;
				categoryJson.name = categoryObj.Nome;
				categoryJson.group = categoryObj.Grupo;
				categoryJson.groupId = categoryObj.IdGrupo;
				categoryJson.subGroup = categoryObj.SubGrupo;
				categoryJson.subGroupId = categoryObj.IdSubGrupo;

				productFinalObj.categories.push(categoryJson);
			});

			productFinalObj.info = product.FichaProduto.FichaTecnica;
			fullResponse.push(productFinalObj);
		});

		return fullResponse;
	},

	makeRequest(uri) {
		var calledXML = '';

		switch (uri) {
			case 'full':
				calledXML = catalogHelper.catalogFull;
				break;
			case 'partial':
				calledXML = catalogHelper.catalogPartial;
				break;
			case 'stock':
				calledXML = catalogHelper.stockAvailability;
				break;
			case 'category':
				calledXML = catalogHelper.categoryTree;
				break;
		}

		return got(calledXML)
			.catch(function(catalogError) {
				return errorHelper.errorHandler('main', 0, catalogError);
			})
			.then(catalogHelper.parseBody);
	}

};

module.exports = Object.create(catalogHelper);
