import {Injectable} from '@angular/core';
import {NativeService} from '../services-system/native-service';
import {AppService, LoggerLevel} from '../services-system/app.service';
import {Session} from '../models/session';
import {ConfigurationService} from '../services-system/configuration.service';
import {AccountType} from '../models/AccountType';
import {AwsAccount} from '../models/aws-account';

@Injectable({
  providedIn: 'root'
})
export class SessionService extends NativeService {
  /* This service manage the session manipulation as we need top generate credentials and maintain them for a specific duration */
  constructor(
    private appService: AppService,
    private configurationService: ConfigurationService
  ) { super(); }


  /**
   * Remove a session from the list of sessions
   * @param session - the session to be removed
   */
  removeSession(session) {
    this.appService.logger(`Removing: ${session.account.accountName}`, LoggerLevel.INFO, this);

    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const index = workspace.sessions.findIndex(sess => sess.id === session.id);
    if (index !== -1) {
      workspace.sessions.splice(index, 1);
      this.configurationService.updateWorkspaceSync(workspace);
    }
    return false;
  }

  /**
   * Get the parent Session
   * @param session - the session for retrieving the parent
   */
  parentSession(session) {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const sessions = workspace.sessions;
    return sessions.filter(sess => sess.id === session.account.parent)[0];
  }

  /**
   * Get all the child sessions
   * @param session - parent session
   */
  childSessions(session) {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const sessions = workspace.sessions;
    return sessions.filter(s => (s.account as AwsAccount).parent === session.id);
  }

  /**
   * List sessions inside the current Session list containing all sessions
   */
  listSessions() {
    // this.appService.logger('Listing sessions...', LoggerLevel.INFO, this);
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    if (workspace.sessions) {
      return workspace.sessions;
    }
    return [];
  }

  listTrusterSessions() {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    if (workspace.sessions) {
      const sessions = workspace.sessions;
      return sessions.filter(s => s.account.type === AccountType.AWS_TRUSTER || s.account.parent !== undefined);
    }
    return [];
  }

  alterOrderByTime(sessions) {
    sessions.sort((a, b) => {
      return (a as Session).lastStopDate < (b as Session).lastStopDate ? 1 : -1;
    });
    return sessions;
  }

  /**
   * Start a session, given the session object
   * @param session - the session object to extract the parameter to generate the credentials
   */
  startSession(session: Session) {
    this.appService.logger(`Starting Session: ${session.account.accountName}`, LoggerLevel.INFO, this);

    // Get the current workspace
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    // Get the session list
    const sessions = workspace.sessions;

    // Verify the session exists or not: we do this by checking the role name and the account number
    // Get the session
    const sessionExist = sessions.filter(ses => ses.id === session.id);
    if (sessionExist.length > 0) {
      // Set the session as false for all sessions as a starting point
      sessions.map(sess => {
        if (sess.active && this.appService.isAzure(sess) && this.appService.isAzure(session)) {
          sess.active = false;
          sess.loading = false;
        }
        if (sess.active && !this.appService.isAzure(sess) && !this.appService.isAzure(session)) {
          sess.active = false;
          sess.loading = false;
        }
      });
      // Set active only the selected one
      sessions.map(sess => {
        if (sess.id === session.id) {
          sess.active = true;
          sess.loading = true;
        }
      });
      // Refresh the session list with the new values
      workspace.sessions = sessions;
      this.configurationService.updateWorkspaceSync(workspace);
      // Return ok
      return true;
    } else {
      // Something went wrong return false
      this.appService.logger(`the Selected Session: ${session.account.accountName} does not exist`, LoggerLevel.WARN, this);
      return false;
    }
  }

  /**
   * Stop the current session, setting it to false and updating the workspace
   */
  stopSession(session: Session) {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const sessions = workspace.sessions;
    if (sessions) {
      sessions.map(sess => {
        if (session === null || session.id === sess.id) {
          sess.active = false;
          sess.loading = false;
          sess.lastStopDate = new Date().toISOString();
        }
      });
    }
    workspace.sessions = sessions;
    this.configurationService.updateWorkspaceSync(workspace);
    if (session !== null) {
      this.appService.logger('Stopping session', LoggerLevel.INFO, this, JSON.stringify({ timeStamp: new Date().toISOString(), id: session.id, account: session.account.accountName }, null, 3));
    } else {
      this.appService.logger('Stopping session', LoggerLevel.INFO, this, JSON.stringify({ timeStamp: new Date().toISOString() }, null, 3));
    }
    return true;
  }

  stopAllSession() {
    this.appService.logger('Stopping all sessions...', LoggerLevel.INFO, this);
    this.stopSession(null);
  }

  getSession(sessionId: string, mysessions?: Session[]) {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const sessions = mysessions || workspace.sessions;
    if (sessions) {
      return sessions.filter(s => s.id === sessionId)[0];
    }
    return undefined;
  }
}
