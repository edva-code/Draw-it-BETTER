import { createHubProvider } from "./HubFactory.jsx";

const { HubContext: GameplayHubContext, HubProvider: GameplayHubProvider } = createHubProvider(`/hubs/gameplay`);

export { GameplayHubContext, GameplayHubProvider };