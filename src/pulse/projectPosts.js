import { createContext } from 'react';
/** The posts of the project in the current scope, for small previews (account card, top posts of a day)
 * that need them far from where the data was loaded. Null outside a project page. */
export const ProjectPostsContext = createContext(null);
