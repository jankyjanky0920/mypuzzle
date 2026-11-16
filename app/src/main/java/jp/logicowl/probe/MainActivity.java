package jp.logicowl.probe;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.Context;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.provider.Settings;
import android.graphics.Typeface;
import android.widget.*;
import android.view.View;

public final class MainActivity extends Activity {
  private TextView output;
  private Button add(LinearLayout l,String name,View.OnClickListener action){
    Button b=new Button(this); b.setText(name); l.addView(b); b.setOnClickListener(action); return b;
  }
  @Override public void onCreate(Bundle b) {
    super.onCreate(b);
    ScrollView scroll=new ScrollView(this); LinearLayout col=new LinearLayout(this);
    col.setOrientation(1); col.setPadding(30,28,30,20); scroll.addView(col);
    TextView title=new TextView(this); title.setText("Logic Owl 文字取得テスト");
    title.setTextSize(22); title.setTypeface(null,Typeface.BOLD); col.addView(title);
    TextView info=new TextView(this); info.setText("1. ユーザー補助を有効にする\n2. Logic Owlで1問クリアする\n3. 戻って結果を更新・コピーする\n\n既存の15分抽選アプリとは別アプリです。記録を変更しません。\n");
    info.setTextSize(15);col.addView(info);
    add(col,"① ユーザー補助を設定",v->startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
    add(col,"② Logic Owlを開く",v->{
      Intent i=getPackageManager().getLaunchIntentForPackage("de.goodowlapps.logicpuzzles");
      if(i!=null)startActivity(i);else Toast.makeText(this,"Logic Owlを開けません",Toast.LENGTH_LONG).show();
    });
    add(col,"③ 結果を更新",v->refresh());
    add(col,"診断結果をコピー",v->{
      ClipboardManager cm=(ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE);
      cm.setPrimaryClip(ClipData.newPlainText("Logic Owl診断",output.getText()));
      Toast.makeText(this,"コピーしました。ChatGPTへ貼り付けてください",Toast.LENGTH_LONG).show();
    });
    add(col,"診断結果を削除",v->{getSharedPreferences("probe",MODE_PRIVATE).edit().clear().apply();refresh();});
    output=new TextView(this);output.setTextSize(14);output.setTextIsSelectable(true);
    output.setPadding(10,24,10,24);col.addView(output);
    setContentView(scroll);refresh();
  }
  @Override protected void onResume(){super.onResume();if(output!=null)refresh();}
  private void refresh(){
    output.setText(getSharedPreferences("probe",MODE_PRIVATE).getString("report","未検知。ユーザー補助を有効にし、Logic Owlを開いてください。"));
  }
}