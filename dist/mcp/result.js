export const jsonResult = (data) => ({
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
});
