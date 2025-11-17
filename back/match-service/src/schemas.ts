export const createMatchSchema = {
	body: {
		type: 'object',
		required: ['type', 'players'],
		properties: {
			type: {
				type: 'string'
			},
			players: {
				type: 'array',
				minItems: 2,
				items: {
					type: 'object',
					required: ['alias'],
					properties: {
						id: { type:['number', 'null']},
						alias: { type: 'string' },
					}
				}
			}
		}
	}
}

export const newMatchSchema = {
	body: {
		type: "object",
		required: ["name"],
		properties: {
		  name: { type: "string" },
		}
	}
}


export const resultSchema = {
	body: {
		type: 'object',
		required: ['matchId', 'winner', 'loser'],
		properties: {
			matchId:{
				type: 'number'
			},
			winner: {
				type: 'object',
				required: ['alias', 'id'],
				properties: {
					alias: {type: 'string'},
					id: {type: ['number', 'null']},
				}
			},
			loser: {
				type: 'object',
				required: ['alias', 'id'],
				properties: {
					alias: {type: 'string'},
					id: {type: ['number', 'null']},
				}
			}
		}
	}
}
