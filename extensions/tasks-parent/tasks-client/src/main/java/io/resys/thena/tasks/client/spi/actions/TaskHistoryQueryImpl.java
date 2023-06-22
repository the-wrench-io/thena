package io.resys.thena.tasks.client.spi.actions;

/*-
 * #%L
 * thena-tasks-client
 * %%
 * Copyright (C) 2021 - 2023 Copyright 2021 ReSys OÜ
 * %%
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * #L%
 */

import io.resys.thena.docdb.api.actions.HistoryActions;
import io.resys.thena.docdb.api.models.Objects;
import io.resys.thena.docdb.api.models.ObjectsResult;
import io.resys.thena.docdb.spi.ClientQuery;
import io.resys.thena.docdb.spi.ImmutableBlobCriteria;
import io.resys.thena.docdb.spi.support.RepoAssert;
import io.resys.thena.tasks.client.api.actions.TaskActions;
import io.resys.thena.tasks.client.api.model.Task;
import io.resys.thena.tasks.client.spi.store.DocumentStore;
import io.resys.thena.tasks.client.spi.store.DocumentStoreException;
import io.resys.thena.tasks.client.spi.store.ImmutableDocumentExceptionMsg;
import io.resys.thena.tasks.client.spi.visitors.HistoryVisitor;
import io.smallrye.mutiny.Uni;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Slf4j
public class TaskHistoryQueryImpl implements TaskActions.TaskHistoryQuery {

  private final DocumentStore ctx;

  @Override
  public Uni<Task.TaskHistory> get(String taskId) {
    RepoAssert.notNull(taskId, () -> "taskId can't be null!");

    final var config = ctx.getConfig();
    return config.getClient().history().blob()
        .repo(config.getRepoName(), config.getHeadName())
        .criteria(ImmutableBlobCriteria.builder().type(ClientQuery.CriteriaType.EXACT).key("id").value(taskId).build())
        .latestOnly(false)
        .build()
        .onItem().transform(historyResult -> this.validateHistory(historyResult, taskId))
        .onItem().transform(blobHistory -> new HistoryVisitor().visitBlobHistory(blobHistory).build());
  }

  private List<Objects.BlobHistory> validateHistory(HistoryActions.BlobHistoryResult state, String taskId) {
    if(state.getStatus() != ObjectsResult.ObjectsStatus.OK) {
      final var config = ctx.getConfig();
      throw new DocumentStoreException("FIND_HISTORY_FAIL", ImmutableDocumentExceptionMsg.builder()
          .id(state.getRepo() == null ? config.getRepoName() : state.getRepo().getName())
          .value(state.getRepo() == null ? "no-repo" : state.getRepo().getId())
          .addAllArgs(state.getMessages().stream().map(message->message.getText()).collect(Collectors.toList()))
          .build());
    }

    final var historyItems = state.getValues();
    if(historyItems.isEmpty()) {
      final var config = ctx.getConfig();
      throw new DocumentStoreException("FIND_TASK_FAIL", ImmutableDocumentExceptionMsg.builder()
          .id(state.getRepo() == null ? config.getRepoName() : state.getRepo().getName())
          .value(state.getRepo() == null ? "no-repo" : state.getRepo().getId())
          .addAllArgs(List.of("Task with id: " + taskId + " not found!"))
          .build());
    }
    return historyItems;
  }
}
