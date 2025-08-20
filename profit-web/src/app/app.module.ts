import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { AppComponent } from "./app.component";
import { MainLayoutModule } from "./main-layout/main-layout.module";
import { AppRoutingModule } from "./app.routes";

@NgModule({
    declarations: [AppComponent],
    imports: [BrowserModule, AppRoutingModule, MainLayoutModule],
    providers: [],
    bootstrap: [AppComponent]
})  
export class AppModule { } 