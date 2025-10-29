export const createMatchSchema = {
	body: {
		type: 'object',
		required: ['players'],
		properties: {
			players: {
				type: 'array',
				minItems: 2,
				items: {
					type: 'object',
					required: ['alias', 'remote'],
					properties: {
						auth_user_id: { type:['number', 'null']},
						alias: { type: 'string' },
						remote: { type: 'boolean' }
					}
				}
			}
		}
	}
}
