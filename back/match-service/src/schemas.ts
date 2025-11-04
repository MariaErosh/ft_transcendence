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
