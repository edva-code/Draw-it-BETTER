import { createHubProvider } from "./HubFactory.jsx";

const { HubContext: LobbyHubContext, HubProvider: LobbyHubProvider } = createHubProvider(`/hubs/lobby`);

export { LobbyHubContext, LobbyHubProvider };