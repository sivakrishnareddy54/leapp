import {AfterViewInit, Component, Input, OnInit} from '@angular/core';
import {ExecuteServiceService} from '../../services-system/execute-service.service';
import {AppService, LoggerLevel} from '../../services-system/app.service';
import {Router} from '@angular/router';
import {ConfigurationService} from '../../services-system/configuration.service';
import {WorkspaceService} from '../../services/workspace.service';
import {environment} from '../../../environments/environment';
import {AntiMemLeak} from '../../core/anti-mem-leak';
import {LicenceService} from '../../services/licence.service';

@Component({
  selector: 'app-wizard-page',
  templateUrl: './dependencies-page.component.html',
  styleUrls: ['./dependencies-page.component.scss']
})
export class DependenciesPageComponent extends AntiMemLeak implements OnInit, AfterViewInit {

  // tell us if we are in lite client mode or not
  liteClient = environment.liteClient;

  private OS: string;

  @Input() versionLabel = '...';
  @Input() licenceLabel = '...';

  enabled = false;
  showCLiError = false;
  genericError = false;
  licenceError = false;
  cliError = false;

  loading = true;

  licenceErrorMessage;

  constructor(
    private router: Router,
    private exec: ExecuteServiceService,
    public app: AppService,
    private configurationService: ConfigurationService,
    private workspaceService: WorkspaceService,
    private licenceService: LicenceService
  ) {
    super();

    this.OS = this.app.detectOs();
    this.app.enablePowerMonitorFeature();
  }

  ngOnInit() {

    // Resolve directly everything at the start of the component
    // (in this case we check for sotfware and licence, with the click of the mouse we check the cli instead)
    this.resolveUpdateDependenciesAndLicence();

    // If not first time resolve dependencies directly
    this.resolveDirectly();
  }

  ngAfterViewInit() {
    this.app.generateMenu();
  }

  resolveDirectly() {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    if (workspace.accountRoleMapping &&
      workspace.accountRoleMapping.accounts &&
      workspace.accountRoleMapping.accounts.length > 0) {
      this.resolveDependenciesMvp();
    }
  }

  // Resolve all the passages for the Mvp first screen
  resolveUpdateDependenciesAndLicence() {
    this.enabled = true;
    this.loading = false;
  }

  // MVP: we use this to just check if aws cli is installed in order to proceed to
  // step 3: when going off MVP return to correct method above
  resolveDependenciesMvp() {
    this.loading = true;

    // Resolve licence here
    console.log();


    let sub = this.licenceService.checkLicence().subscribe(licenceOk => {

      // Valid Licence already go on as always
      sub = this.exec.execute(this.exec.getAwsCliCheck(this.OS), true).subscribe(ok => {
        const workspace = this.configurationService.getDefaultWorkspaceSync();
        if (workspace.accountRoleMapping &&
            workspace.accountRoleMapping.accounts &&
            workspace.accountRoleMapping.accounts.length > 0) {
          // Stop the loader
          this.loading = false;
          // We already have at least one default account to start, let's go to session page
          this.router.navigate(['/sessions', 'session-selected']);
        } else {
          // We need to setup at least on e Principal Account and Role (aka Federated one)
          // But we also check for the new liteClient variable: if true we go to the setup,
          // otherwise we go directly to the session download as we need the list
          if (this.liteClient) {
            // Stop the loader
            this.loading = false;
            this.router.navigate(['/wizard', 'setup-welcome']);
          } else {
            // Stop the loader
            this.loading = false;
            this.router.navigate(['/wizard', 'setup-workspace']);
          }
        }
      }, ko => {
        // Stop the loader
        this.loading = false;
        // Show the cli error subpage
        this.licenceError = false;
        this.genericError = false;
        this.cliError = true;
        this.showCLiError = true;
        this.app.logger('user does not have aws cli installed: ' + ko, LoggerLevel.WARN);

      });

      this.subs.add(sub);
    }, licenceKo => {
      // Stop the loader
      this.loading = false;

      // Here we are checking the licence as we:
      // a) don't have a licence yet - go to the licence page
      // b) have a generic error in the licence for whatever reasons - show the licence error subpage
      if (licenceKo.newLicence) {
        // Go to new licence page
        this.router.navigate(['/wizard', 'setup-licence']);

      } else {
        // Show the licence error subpage
        this.licenceErrorMessage = licenceKo.message;
        this.licenceError = true;
        this.genericError = false;
        this.cliError = false;
        this.showCLiError = true;
        this.app.logger('user does not have valid licence installed: ' + licenceKo.message, LoggerLevel.WARN);
      }
    });

    this.subs.add(sub);
  }

}