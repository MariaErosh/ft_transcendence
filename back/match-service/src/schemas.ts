export const createMatchSchema = {
	body: {
		type: 'object',
		required: ['type', 'players'],
		properties: {
			type: {
				type: 'string'
			},
			name: {
				type: 'string',
				nullable: true
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


export const resultSchema = {
	body: {
		type: 'object',
		required: ['gameId', 'winner', 'loser'],
		properties: {
			gameId:{
				type: 'number'
			},
			winner: {
				type: 'object',
				required: ['alias', 'id'],
				properties: {
					alias: {type: 'string'},
					id: {type: 'number', nullable: true},
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
