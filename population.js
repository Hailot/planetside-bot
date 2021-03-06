// This file defines functions for retrieving population by faction for a given server/world
const Discord = require('discord.js');
var messageHandler = require('./messageHandler.js');
var got = require('got')

var getPopulation = async function(world){
	let url = '';
	if(world == 2000){
		url = 'http://ps4eu.ps2.fisu.pw/api/population/?world=2000';
	}
	else if(world == 1000){
		url = 'http://ps4us.ps2.fisu.pw/api/population/?world=1000';
	}
	else{
		url = 'http://ps2.fisu.pw/api/population/?world='+world;
	}
	let response = await got(url).json();
	if(typeof(response.error) !== 'undefined'){
		return new Promise(function(resolve, reject){
			reject(response.error);
		})
	}
	if(response.statusCode == 404){
		return new Promise(function(resolve, reject){
			reject("API Unreachable");
		})
	}
	let resObj = {
		vs: response.result[0].vs,
		nc: response.result[0].nc,
		tr: response.result[0].tr,
		ns: response.result[0].ns
	}
	return new Promise(function(resolve, reject){
		resolve(resObj);
	})
}

function nameToWorld(name){
	switch (name.toLowerCase()){
		case "connery":
			return 1;
		case "miller":
			return 10;
		case "cobalt":
			return 13;
		case "emerald":
			return 17;
		case "jaegar":
			return 19;
		case "soltech":
			return 40;
		case "genudine":
			return 1000;
		case "ceres":
			return 2000;
	}
	return null
}

function normalize(name){
	switch (name.toLowerCase()){
		case "connery":
			return "Connery";
		case "miller":
			return "Miller";
		case "cobalt":
			return "Cobalt";
		case "emerald":
			return "Emerald";
		case "jaegar":
			return "Jaegar";
		case "soltech":
			return "SolTech";
		case "genudine":
			return "Genudine";
		case "ceres":
			return "Ceres";
	}
	return null
}

module.exports = {
	lookup: async function(server){
		if(messageHandler.badQuery(server)){
			return new Promise(function(resolve, reject){
                reject("Server search contains disallowed characters");
            })
		}

		let world = nameToWorld(server);
		let normalized = normalize(server);
		if(world == null){
			return new Promise(function(resolve, reject){
				reject(server+" not found.");
			})
		}
		let res = {}
		try{
			res = await getPopulation(world);
		}
		catch(err){
			return new Promise(function(resolve, reject){
					reject(err);
				})
		}
		let sendEmbed = new Discord.MessageEmbed();
		let total = Number(res.vs) + Number(res.nc) + Number(res.tr) + Number(res.ns);
		sendEmbed.setTitle(normalized+" Population - "+total);
		let vsPc = (res.vs/total)*100;
		vsPc = Number.parseFloat(vsPc).toPrecision(3);
		let ncPc = (res.nc/total)*100;
		ncPc = Number.parseFloat(ncPc).toPrecision(3);
		let trPc = (res.tr/total)*100;
		trPc = Number.parseFloat(trPc).toPrecision(3);
		let nsPc = (res.ns/total)*100;
		nsPc = Number.parseFloat(nsPc).toPrecision(3);
		sendEmbed.addField('VS', res.vs+" ("+vsPc+"%)", true);
		sendEmbed.addField('NC', res.nc+" ("+ncPc+"%)", true);
		sendEmbed.addField('TR', res.tr+" ("+trPc+"%)", true);
		sendEmbed.addField('NSO', res.ns+" ("+nsPc+"%)", true);
		sendEmbed.setTimestamp();
		if(world == 2000){
			sendEmbed.setFooter('Data from ps4eu.ps2.fisu.pw');
		}
		else if(world == 1000){
			sendEmbed.setFooter('Data from ps4us.ps2.fisu.pw');
		}
		else{
			sendEmbed.setFooter('Data from ps2.fisu.pw');
		}
		return new Promise(function(resolve, reject){
			resolve(sendEmbed);z
		})
	}
}